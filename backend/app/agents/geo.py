from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.geo import geo_provider
from app.schemas.domain import UbicacionResuelta
import structlog

log = structlog.get_logger()

class GeoAgent(BaseAgent):
    def __init__(self):
        super().__init__("GeoAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        lat = state.context.get("lat")
        lon = state.context.get("lon")
        direccion_texto = state.context.get("direccion_texto")
        
        ubicacion = None
        
        # 1. Si tenemos GPS explícito, usarlo directamente o hacer reverse geocoding
        if lat and lon:
            # Para esta demostración, simulamos la dirección si no queremos gastar llamadas a Nominatim
            # TODO: implementar reverse geocoding en geo_provider
            ubicacion = UbicacionResuelta(
                texto=direccion_texto or "Ubicación del dispositivo",
                lat=lat,
                lon=lon,
                fuente="gps"
            )
        # 2. Si hay texto, usamos Geoapify/Nominatim
        elif direccion_texto:
            # Agregamos 'Bogotá' para mejorar precisión de búsqueda si no lo tiene
            query = direccion_texto
            if "bogota" not in query.lower() and "bogotá" not in query.lower():
                query += ", Bogotá"
                
            geo_result = await geo_provider.geocode(query)
            if geo_result:
                ubicacion = UbicacionResuelta(
                    texto=geo_result["direccion"],
                    lat=geo_result["lat"],
                    lon=geo_result["lon"],
                    fuente=geo_result["fuente"]
                )
                
        if not ubicacion:
            # Fallback en caso de que no haya ni GPS ni texto que se pueda resolver
            log.warning("No se pudo determinar la ubicación")
            state.context["ubicacion"] = None
        else:
            state.context["ubicacion"] = ubicacion
            log.info("Ubicación resuelta", texto=ubicacion.texto, fuente=ubicacion.fuente)
