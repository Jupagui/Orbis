from app.orchestrator.state import BaseAgent, OrchestratorState
from app.schemas.domain import UbicacionResuelta
from app.agents.comun import BOGOTA_CENTRO
import app.tools.geo  # noqa: F401  (registra las herramientas de mapas)
import app.tools.local  # noqa: F401  (registra herramientas de datos propios)
import structlog

log = structlog.get_logger()


class GeoAgent(BaseAgent):
    """Resuelve la ubicación del caso usando el servicio externo de mapas."""

    def __init__(self):
        super().__init__("GeoAgent")

    async def _process(self, state: OrchestratorState):
        lat = state.context.get("lat")
        lon = state.context.get("lon")
        direccion_texto = state.context.get("direccion_texto")
        ubicacion = None

        # 1. Si el usuario escribió una dirección, tiene prioridad sobre el GPS
        if direccion_texto:
            query = direccion_texto
            if "bogota" not in query.lower() and "bogotá" not in query.lower():
                query += ", Bogotá"
            try:
                geo = await state.usar_herramienta(self.name, "geocodificar_direccion", direccion=query)
            except Exception:
                geo = None
            if geo:
                ubicacion = UbicacionResuelta(texto=geo["direccion"], lat=geo["lat"], lon=geo["lon"],
                                              barrio=geo.get("barrio"), fuente=geo["fuente"])
                state.context["ubicacion_aproximada"] = geo.get("aproximada", False)

        # 2. Si hay GPS, se traduce a dirección con geocodificación inversa
        if not ubicacion and lat is not None and lon is not None:
            try:
                geo = await state.usar_herramienta(self.name, "identificar_direccion", lat=lat, lon=lon)
            except Exception:
                geo = None
            ubicacion = UbicacionResuelta(
                texto=(geo or {}).get("direccion") or "Ubicación del dispositivo",
                lat=lat, lon=lon, barrio=(geo or {}).get("barrio"), fuente="gps"
            )

        if ubicacion:
            state.context["ubicacion"] = ubicacion
            log.info("Ubicación resuelta", texto=ubicacion.texto, fuente=ubicacion.fuente)

            # Alertas comunitarias: reportes viales abiertos a menos de 500 m (los usan los agentes de dominio)
            reportes = await state.usar_herramienta(self.name, "consultar_reportes_cercanos",
                                                    lat=ubicacion.lat, lon=ubicacion.lon, radio_m=500)
            state.context["alertas_comunitarias"] = [
                f"{r['tipo_problema']} (severidad {r['severidad']}) a {r['distancia_m']} m" for r in reportes[:5]
            ]
            return ubicacion

        # 3. Sin ubicación: se usa el centro de Bogotá solo como referencia y el verificador lo advierte
        log.warning("No se pudo determinar la ubicación")
        state.context["ubicacion"] = UbicacionResuelta(
            texto="Centro de Bogotá (referencia, ubicación no confirmada)",
            lat=BOGOTA_CENTRO[0], lon=BOGOTA_CENTRO[1], fuente="referencia"
        )
        return {"ubicacion": "no confirmada"}
