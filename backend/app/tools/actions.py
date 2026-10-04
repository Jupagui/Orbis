from app.core.db import AsyncSessionLocal
from app.models.domain import ReporteVial, SolicitudAsistencia, Recorrido, ParadaRecorrido, Recomendacion
from app.tools.registry import tool_registry
import structlog

log = structlog.get_logger()

@tool_registry.register
async def crear_reporte_vial(caso_id: str, tipo_problema: str, severidad: str, lat: float, lon: float, direccion: str, barrio: str = None):
    async with AsyncSessionLocal() as session:
        reporte = ReporteVial(
            caso_id=caso_id,
            tipo_problema=tipo_problema,
            severidad=severidad,
            lat=lat,
            lon=lon,
            direccion=direccion,
            barrio=barrio
        )
        session.add(reporte)
        await session.commit()
        await session.refresh(reporte)
        return {"reporte_id": reporte.id, "estado": "creado"}

@tool_registry.register
async def crear_solicitud_asistencia(caso_id: str, tipo_vehiculo: str, falla_probable: str, urgencia: str, puede_conducir: bool):
    async with AsyncSessionLocal() as session:
        solicitud = SolicitudAsistencia(
            caso_id=caso_id,
            tipo_vehiculo=tipo_vehiculo,
            falla_probable=falla_probable,
            urgencia=urgencia,
            puede_conducir=puede_conducir
        )
        session.add(solicitud)
        await session.commit()
        await session.refresh(solicitud)
        return {"solicitud_id": solicitud.id, "estado": "abierta"}

@tool_registry.register
async def guardar_recorrido(caso_id: str, titulo: str, distancia_total_m: int, duracion_total_s: int, paradas: list):
    async with AsyncSessionLocal() as session:
        recorrido = Recorrido(
            caso_id=caso_id,
            titulo=titulo,
            distancia_total_m=distancia_total_m,
            duracion_total_s=duracion_total_s
        )
        session.add(recorrido)
        await session.flush()
        
        for p in paradas:
            parada = ParadaRecorrido(
                recorrido_id=recorrido.id,
                orden=p["orden"],
                poi_id=p.get("poi_id"),
                nombre=p["nombre"],
                lat=p["lat"],
                lon=p["lon"],
                minutos_sugeridos=p["minutos_sugeridos"]
            )
            session.add(parada)
            
        await session.commit()
        await session.refresh(recorrido)
        return {"recorrido_id": recorrido.id, "estado": "guardado"}

@tool_registry.register
async def guardar_recomendacion(caso_id: str, lugar_id: int, distancia_m: int, duracion_s: int, motivo: str, fuente: str = "propia"):
    async with AsyncSessionLocal() as session:
        rec = Recomendacion(
            caso_id=caso_id,
            lugar_id=lugar_id,
            distancia_m=distancia_m,
            duracion_s=duracion_s,
            motivo=motivo,
            fuente=fuente
        )
        session.add(rec)
        await session.commit()
        await session.refresh(rec)
        return {"recomendacion_id": rec.id, "estado": "guardada"}
