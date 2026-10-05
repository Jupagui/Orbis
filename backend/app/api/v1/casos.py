from fastapi import APIRouter, Depends, BackgroundTasks, Form, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from pydantic import BaseModel, Field
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
import io
import json
import time
import structlog

from app.core.config import get_settings
from app.core.db import get_db_session, AsyncSessionLocal
from app.models.domain import Caso, Traza, MensajeChat
from app.schemas.api import CasoResponse
from app.orchestrator.state import OrchestratorState, a_json
from app.orchestrator.pipeline import Pipeline
from app.agents import chat as chat_agent
from app.agents.verificador import ORDEN_PRIORIDAD

log = structlog.get_logger()
router = APIRouter()
settings = get_settings()

MAX_IMAGEN_BYTES = 10 * 1024 * 1024


async def guardar_trazas(caso_id: str, trazas: list):
    async with AsyncSessionLocal() as sess:
        for t in trazas:
            sess.add(Traza(caso_id=caso_id, orden=t["orden"], agente=t["agente"], herramienta=t.get("herramienta"),
                           input_json=t.get("input_json"), output_json=t.get("output_json"),
                           duracion_ms=t.get("duracion_ms", 0), estado=t.get("estado")))
        await sess.commit()


async def process_caso_background(caso_id: str, context: dict):
    # En producción esto usaría una cola de tareas (Celery/Arq)
    state = OrchestratorState(caso_id=caso_id)
    state.context = context
    pipeline = Pipeline()

    try:
        await pipeline.run(state)
        respuesta = state.context["respuesta_final"]
        calidad = respuesta.calidad_informacion
        async with AsyncSessionLocal() as sess:
            caso = await sess.get(Caso, caso_id)
            if caso:
                caso.estado = "completado" if calidad and calidad.suficiente and not calidad.fuera_de_contexto else "requiere_info"
                caso.resultado_json = respuesta.model_dump_json()
                caso.tipo = respuesta.intencion
                caso.prioridad = respuesta.prioridad
                if respuesta.ubicacion and respuesta.ubicacion.fuente != "referencia":
                    caso.lat, caso.lon = respuesta.ubicacion.lat, respuesta.ubicacion.lon
                    caso.direccion = respuesta.ubicacion.texto
                await sess.commit()
    except Exception as e:
        log.error("Pipeline failed", error=str(e))
        async with AsyncSessionLocal() as sess:
            caso = await sess.get(Caso, caso_id)
            if caso:
                caso.estado = "error"
                caso.resultado_json = json.dumps({"error": str(e)}, ensure_ascii=False)
                await sess.commit()
    finally:
        # Las trazas se guardan siempre, también si hubo error (sirven para explicar qué falló)
        await guardar_trazas(caso_id, state.trazas)


def guardar_imagen(contenido: bytes, caso_id: str) -> str:
    """Corrige la orientación, reduce la imagen y la guarda como JPEG. Devuelve la ruta."""
    try:
        imagen = ImageOps.exif_transpose(Image.open(io.BytesIO(contenido)))
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="El archivo adjunto no es una imagen válida")
    imagen = imagen.convert("RGB")
    imagen.thumbnail((settings.IMAGEN_LADO_MAXIMO, settings.IMAGEN_LADO_MAXIMO))
    carpeta = Path(settings.UPLOADS_DIR)
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / f"{caso_id}.jpg"
    imagen.save(ruta, "JPEG", quality=85)
    return str(ruta)


@router.get("/casos")
async def listar_casos(orden: str = "recientes", db: AsyncSession = Depends(get_db_session)):
    """Historial de casos procesados (persistencia). orden=prioridad pone primero los más urgentes."""
    query = select(Caso)
    if orden == "prioridad":
        rango = case(*[(Caso.prioridad == p, n) for p, n in ORDEN_PRIORIDAD.items()], else_=len(ORDEN_PRIORIDAD))
        query = query.order_by(rango, Caso.creado_en.desc())
    else:
        query = query.order_by(Caso.creado_en.desc())
    result = await db.execute(query.limit(100))
    return [
        {"id": c.id, "tipo": c.tipo, "estado": c.estado, "prioridad": c.prioridad, "descripcion": c.descripcion,
         "direccion": c.direccion, "tiene_imagen": bool(c.imagen_path), "creado_en": c.creado_en}
        for c in result.scalars().all()
    ]


@router.get("/casos/viales")
async def get_casos_viales(db: AsyncSession = Depends(get_db_session)):
    query = select(Caso).where(Caso.lat != None)
    result = await db.execute(query)
    casos = result.scalars().all()

    return [
        {
            "id": c.id,
            "lat": c.lat,
            "lon": c.lon,
            "creado_en": c.creado_en,
            "descripcion": c.descripcion,
            "estado": c.estado,
            "tipo": c.tipo
        } for c in casos
    ]


@router.post("/casos", response_model=CasoResponse, status_code=202)
async def create_caso(
    background_tasks: BackgroundTasks,
    descripcion: str = Form(...),
    lat: float = Form(None),
    lon: float = Form(None),
    direccion: str = Form(None),
    tipo: str = Form(None),
    imagen: UploadFile = File(None),
    db: AsyncSession = Depends(get_db_session)
):
    contenido = None
    if imagen and imagen.filename:
        contenido = await imagen.read()
        if len(contenido) > MAX_IMAGEN_BYTES:
            raise HTTPException(status_code=413, detail="La imagen supera 10 MB")

    caso = Caso(descripcion=descripcion, lat=lat, lon=lon, direccion=direccion,
                tipo=tipo or "indefinido", estado="procesando")
    db.add(caso)
    await db.commit()
    await db.refresh(caso)

    if contenido:
        caso.imagen_path = guardar_imagen(contenido, caso.id)
        await db.commit()

    context = {
        "texto_usuario": descripcion,
        "lat": lat,
        "lon": lon,
        "direccion_texto": direccion,
        "imagen_path": caso.imagen_path,
    }

    # Ejecutar pipeline asíncronamente
    background_tasks.add_task(process_caso_background, caso.id, context)

    return CasoResponse(id=caso.id, estado=caso.estado, mensaje="Caso recibido y procesando")


@router.get("/casos/{caso_id}")
async def get_caso(caso_id: str, db: AsyncSession = Depends(get_db_session)):
    caso = await db.get(Caso, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    return {
        "id": caso.id,
        "estado": caso.estado,
        "tipo": caso.tipo,
        "prioridad": caso.prioridad,
        "descripcion": caso.descripcion,
        "direccion": caso.direccion,
        "tiene_imagen": bool(caso.imagen_path),
        "creado_en": caso.creado_en,
        "resultado": json.loads(caso.resultado_json) if caso.resultado_json else None
    }


@router.get("/casos/{caso_id}/imagen")
async def get_imagen(caso_id: str, db: AsyncSession = Depends(get_db_session)):
    caso = await db.get(Caso, caso_id)
    if not caso or not caso.imagen_path or not Path(caso.imagen_path).exists():
        raise HTTPException(status_code=404, detail="El caso no tiene imagen")
    return FileResponse(caso.imagen_path, media_type="image/jpeg")


@router.get("/casos/{caso_id}/trazas")
async def get_trazas(caso_id: str, db: AsyncSession = Depends(get_db_session)):
    """Trazabilidad: qué agentes y herramientas participaron, con qué datos y cuánto tardaron."""
    result = await db.execute(select(Traza).where(Traza.caso_id == caso_id).order_by(Traza.orden))
    return [
        {"orden": t.orden, "agente": t.agente, "herramienta": t.herramienta, "estado": t.estado,
         "duracion_ms": t.duracion_ms, "entrada": t.input_json, "salida": t.output_json}
        for t in result.scalars().all()
    ]


# ---------------- Chat contextual ----------------

class ChatRequest(BaseModel):
    pregunta: str = Field(min_length=1, max_length=1000)


@router.get("/casos/{caso_id}/chat")
async def get_chat(caso_id: str, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(MensajeChat).where(MensajeChat.caso_id == caso_id).order_by(MensajeChat.id))
    return [{"rol": m.rol, "contenido": m.contenido, "creado_en": m.creado_en} for m in result.scalars().all()]


@router.post("/casos/{caso_id}/chat")
async def post_chat(caso_id: str, body: ChatRequest, db: AsyncSession = Depends(get_db_session)):
    caso = await db.get(Caso, caso_id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    if caso.estado == "procesando" or not caso.resultado_json:
        raise HTTPException(status_code=409, detail="El caso aún se está analizando")

    trazas = (await db.execute(select(Traza).where(Traza.caso_id == caso_id).order_by(Traza.orden))).scalars().all()
    mensajes = (await db.execute(select(MensajeChat).where(MensajeChat.caso_id == caso_id).order_by(MensajeChat.id))).scalars().all()
    historial = [{"rol": m.rol, "contenido": m.contenido} for m in mensajes][-10:]

    inicio = time.perf_counter()
    try:
        respuesta = await chat_agent.responder(json.loads(caso.resultado_json), trazas, historial, body.pregunta)
        estado = "completed"
    except Exception as e:
        log.error("Error en chat", error=str(e))
        respuesta, estado = "No pude responder en este momento. Intenta de nuevo.", "error"

    db.add(MensajeChat(caso_id=caso_id, rol="usuario", contenido=body.pregunta))
    db.add(MensajeChat(caso_id=caso_id, rol="asistente", contenido=respuesta))

    # El chat también queda en la trazabilidad del caso
    ultimo_orden = (await db.execute(select(func.max(Traza.orden)).where(Traza.caso_id == caso_id))).scalar() or 0
    db.add(Traza(caso_id=caso_id, orden=ultimo_orden + 1, agente="ChatAgent", herramienta=None,
                 input_json=a_json({"pregunta": body.pregunta, "mensajes_previos": len(historial)}),
                 output_json=a_json(respuesta), duracion_ms=int((time.perf_counter() - inicio) * 1000), estado=estado))
    await db.commit()

    return {"rol": "asistente", "contenido": respuesta}
