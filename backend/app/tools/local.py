from sqlalchemy import select, and_
from app.core.db import AsyncSessionLocal
from app.models.domain import Lugar, Especialidad, LugarEspecialidad, GuiaEstabilizacion, PuntoInteres
from app.tools.registry import tool_registry
import structlog
import json
import math

log = structlog.get_logger()

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000 # Radio de la tierra en metros
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return int(R * c)

@tool_registry.register
async def consultar_lugares_propios(categoria: str, lat: float, lon: float, radio_m: int = 5000, subcategoria: str = None):
    async with AsyncSessionLocal() as session:
        query = select(Lugar).where(Lugar.categoria == categoria)
        if subcategoria:
            query = query.where(Lugar.subcategoria == subcategoria)
        result = await session.execute(query)
        lugares = result.scalars().all()
        
        # Filtrar por distancia en memoria (para SQLite sin extensiones espaciales)
        cercanos = []
        for l in lugares:
            dist = haversine(lat, lon, l.lat, l.lon)
            if dist <= radio_m:
                cercanos.append({
                    "id": l.id,
                    "nombre": l.nombre,
                    "direccion": l.direccion,
                    "telefono": l.telefono,
                    "precio_promedio": l.precio_promedio,
                    "rango_precio": l.rango_precio,
                    "rating": l.rating,
                    "horario": l.horario,
                    "distancia_m": dist,
                    "lat": l.lat,
                    "lon": l.lon
                })
        cercanos.sort(key=lambda x: x["distancia_m"])
        return cercanos

@tool_registry.register
async def consultar_especialidades(sintomas: str):
    # En un sistema real esto usaría vector search o FTS.
    # Por ahora devolvemos la lista para que el LLM decida.
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Especialidad))
        esps = result.scalars().all()
        return [{"id": e.id, "nombre": e.nombre} for e in esps]

@tool_registry.register
async def consultar_guias_estabilizacion():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(GuiaEstabilizacion))
        guias = result.scalars().all()
        return [
            {
                "condicion": g.condicion, 
                "pasos": json.loads(g.pasos), 
                "que_no_hacer": json.loads(g.que_no_hacer),
                "especialidad_id": g.especialidad_id
            } for g in guias
        ]

@tool_registry.register
async def consultar_puntos_interes(lat: float, lon: float, radio_m: int = 5000):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(PuntoInteres))
        pois = result.scalars().all()
        
        cercanos = []
        for p in pois:
            dist = haversine(lat, lon, p.lat, p.lon)
            if dist <= radio_m:
                cercanos.append({
                    "id": p.id,
                    "nombre": p.nombre,
                    "categoria": p.categoria,
                    "descripcion": p.descripcion,
                    "distancia_m": dist,
                    "lat": p.lat,
                    "lon": p.lon,
                    "horario": p.horario,
                    "costo_entrada": p.costo_entrada
                })
        cercanos.sort(key=lambda x: x["distancia_m"])
        return cercanos

@tool_registry.register
def evaluar_senales_alarma(sintomas: str):
    """Reglas deterministas para encontrar urgencias graves inmediatamente"""
    sintomas_lower = sintomas.lower()
    alarmas = []
    if "pecho" in sintomas_lower and ("duele" in sintomas_lower or "dolor" in sintomas_lower or "presion" in sintomas_lower):
        alarmas.append("Posible infarto")
    if "sangre" in sintomas_lower and ("mucha" in sintomas_lower or "abundante" in sintomas_lower or "no para" in sintomas_lower):
        alarmas.append("Hemorragia severa")
    if "respira" in sintomas_lower and ("no" in sintomas_lower or "dificultad" in sintomas_lower):
        alarmas.append("Dificultad respiratoria aguda")
    
    return {"hay_alarma": len(alarmas) > 0, "alarmas": alarmas}

@tool_registry.register
def evaluar_riesgo_vehicular(falla: str):
    """Reglas deterministas para encontrar riesgos mecánicos graves inmediatamente"""
    falla_lower = falla.lower()
    riesgos = []
    if "humo" in falla_lower or "fuego" in falla_lower:
        riesgos.append("Riesgo de incendio")
    if "freno" in falla_lower and ("no" in falla_lower or "fallan" in falla_lower):
        riesgos.append("Falla de frenos")
    if "gasolina" in falla_lower and "olor" in falla_lower:
        riesgos.append("Fuga de combustible")
        
    return {"hay_riesgo": len(riesgos) > 0, "riesgos": riesgos}
