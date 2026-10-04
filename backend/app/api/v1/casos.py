from fastapi import APIRouter, Depends, BackgroundTasks, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db_session, AsyncSessionLocal
from app.models.domain import Caso, Traza
from app.schemas.api import CasoCreate, CasoResponse
from app.orchestrator.state import OrchestratorState
from app.orchestrator.pipeline import Pipeline
from sqlalchemy import select
import json
import structlog

log = structlog.get_logger()
router = APIRouter()

async def process_caso_background(caso_id: str, context: dict):
    # En producción esto usaría Celery/Arq y una DB local
    state = OrchestratorState(caso_id=caso_id)
    state.context = context
    pipeline = Pipeline()
    
    try:
        await pipeline.run(state)
        # Guardar resultado final
        if "respuesta_final" in state.context:
            respuesta = state.context["respuesta_final"]
            async with AsyncSessionLocal() as sess:
                caso = await sess.get(Caso, caso_id)
                if caso:
                    caso.estado = "completado"
                    caso.resultado_json = respuesta.model_dump_json()
                    caso.tipo = respuesta.intencion
                    
                    # Guardar trazas
                    for t in state.trazas:
                        sess.add(Traza(
                            caso_id=caso_id,
                            orden=t["orden"],
                            agente=t["agente"],
                            herramienta=t.get("herramienta"),
                            input_json=str(t.get("input_json")),
                            output_json=str(t.get("output_json")),
                            duracion_ms=t.get("duracion_ms", 0),
                            estado=t.get("estado")
                        ))
                    await sess.commit()
    except Exception as e:
        log.error("Pipeline failed", error=str(e))
        async with AsyncSessionLocal() as sess:
            caso = await sess.get(Caso, caso_id)
            if caso:
                caso.estado = "error"
                await sess.commit()

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
    # Crear registro inicial
    caso = Caso(
        descripcion=descripcion,
        lat=lat,
        lon=lon,
        direccion=direccion,
        tipo=tipo or "indefinido",
        estado="procesando"
    )
    
    if imagen:
        # TODO: Guardar imagen y extraer path
        pass
        
    db.add(caso)
    await db.commit()
    await db.refresh(caso)
    
    # Preparar contexto para pipeline
    context = {
        "texto_usuario": descripcion,
        "lat": lat,
        "lon": lon,
        "direccion_texto": direccion
    }
    
    # Ejecutar pipeline asíncronamente
    background_tasks.add_task(process_caso_background, caso.id, context)
    
    return CasoResponse(id=caso.id, estado=caso.estado, mensaje="Caso recibido y procesando")

@router.get("/casos/{caso_id}")
async def get_caso(caso_id: str, db: AsyncSession = Depends(get_db_session)):
    caso = await db.get(Caso, caso_id)
    if not caso:
        return {"error": "Caso no encontrado"}
        
    resultado = json.loads(caso.resultado_json) if caso.resultado_json else None
    
    return {
        "id": caso.id,
        "estado": caso.estado,
        "tipo": caso.tipo,
        "creado_en": caso.creado_en,
        "resultado": resultado
    }
    
@router.get("/casos/{caso_id}/trazas")
async def get_trazas(caso_id: str, db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(Traza).where(Traza.caso_id == caso_id).order_by(Traza.orden))
    trazas = result.scalars().all()
    return [{"orden": t.orden, "agente": t.agente, "estado": t.estado, "duracion_ms": t.duracion_ms} for t in trazas]
