"""Utilidades compartidas por los agentes de dominio."""
import asyncio
import structlog
from app.orchestrator.state import OrchestratorState

log = structlog.get_logger()

# Centro de Bogotá: solo se usa como referencia cuando el usuario no dio ubicación
BOGOTA_CENTRO = (4.6097, -74.0817)

REGLA_GROUNDING = """
REGLAS DE VERACIDAD:
- Usa SOLAMENTE lugares que aparezcan en la lista proporcionada. Nunca inventes nombres, teléfonos, precios ni direcciones.
- Devuelve como máximo 3 lugares. Si la lista tiene menos, devuelve solo los que haya (puede ser ninguno).
- Copia el nombre del lugar EXACTAMENTE como aparece en la lista.
- No calcules distancias ni tiempos: deja distancia_m y duracion_s en 0, el sistema los calcula con el servicio de mapas.
"""


def origen(state: OrchestratorState) -> tuple[float, float]:
    ubicacion = state.context.get("ubicacion")
    return (ubicacion.lat, ubicacion.lon) if ubicacion else BOGOTA_CENTRO


def _normalizar(nombre: str) -> str:
    return (nombre or "").lower().strip()


def filtrar_y_ubicar(sugeridos: list, candidatos: list[dict]) -> list:
    """Descarta lugares que el modelo no tomó de la lista (alucinaciones) y les asigna coordenadas reales."""
    por_nombre = {_normalizar(c["nombre"]): c for c in candidatos}
    validos = []
    for lugar in sugeridos:
        candidato = por_nombre.get(_normalizar(lugar.nombre))
        if not candidato:
            log.warning("Lugar descartado: no está en los datos consultados", nombre=lugar.nombre)
            continue
        lugar.lat, lugar.lon = candidato["lat"], candidato["lon"]
        # Lo que el modelo diga sobre distancias no cuenta: solo valen las del servicio de mapas
        lugar.ruta_verificada = False
        if hasattr(lugar, "fuente") and candidato.get("fuente"):
            lugar.fuente = candidato["fuente"]
        validos.append(lugar)
    return validos


async def completar_rutas(state: OrchestratorState, agente: str, lugares: list, modo: str = "drive") -> None:
    """Consulta en paralelo la ruta real hacia cada lugar y reemplaza distancia/tiempo."""
    lat, lon = origen(state)

    async def una_ruta(lugar):
        try:
            ruta = await state.usar_herramienta(agente, "calcular_ruta", origen_lat=lat, origen_lon=lon,
                                                destino_lat=lugar.lat, destino_lon=lugar.lon, modo=modo)
        except Exception:
            ruta = None
        if ruta:
            lugar.distancia_m, lugar.duracion_s = ruta["distancia_m"], ruta["duracion_s"]
            lugar.ruta_verificada = True

    await asyncio.gather(*(una_ruta(l) for l in lugares))


def texto_alertas(state: OrchestratorState) -> str:
    alertas = state.context.get("alertas_comunitarias", [])
    if not alertas:
        return ""
    return "ALERTAS EN LA ZONA:\n" + "\n".join(alertas) + "\nConsidera advertir al usuario si es relevante."
