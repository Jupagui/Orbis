from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoVial
from app.agents.comun import origen
import app.tools.local  # noqa: F401  (registra herramientas de datos propios)
import app.tools.actions  # noqa: F401  (registra acciones)
import json
import structlog

log = structlog.get_logger()


class VialAgent(BaseAgent):
    """Diagnostica daños en la vía y crea el reporte vial."""

    def __init__(self):
        super().__init__("VialAgent")

    async def _process(self, state: OrchestratorState):
        texto = state.context.get("texto_usuario", "")
        ubicacion = state.context.get("ubicacion")
        lat, lon = origen(state)

        # Herramienta (datos propios): ¿ya hay reportes abiertos en ese punto?
        cercanos = await state.usar_herramienta(self.name, "consultar_reportes_cercanos", lat=lat, lon=lon)

        system_instruction = """
        Eres el agente Vial de ORBIS. Diagnosticas un problema reportado en la vía pública de Bogotá
        (huecos, semáforos, señalización, escombros, árboles caídos) usando el texto y la foto si existe.
        Determina tipo_problema, severidad (baja, media, alta, critica), riesgo para peatones/vehículos y la
        entidad sugerida para resolverlo (p. ej. IDU, UMV, Secretaría de Movilidad, UAESP).
        duplicados_cercanos debe ser exactamente la cantidad de reportes cercanos indicada en el mensaje.
        """

        prompt = f"""
        Problema reportado: '{texto}'
        Dirección/Ubicación: '{ubicacion.texto if ubicacion else "Desconocida"}'
        Reportes abiertos a menos de 150 m (datos propios): {json.dumps(cercanos, ensure_ascii=False)}
        """

        resultado: ResultadoVial = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoVial,
            system_instruction=system_instruction,
            imagen_path=state.context.get("imagen_path")
        )
        resultado.duplicados_cercanos = len(cercanos)

        # Acción: crear el reporte vial (solo si la ubicación es real, no la de referencia)
        if ubicacion and ubicacion.fuente != "referencia":
            accion = await state.usar_herramienta(
                self.name, "crear_reporte_vial",
                caso_id=state.caso_id, tipo_problema=resultado.tipo_problema, severidad=resultado.severidad,
                lat=ubicacion.lat, lon=ubicacion.lon, direccion=ubicacion.texto, barrio=ubicacion.barrio
            )
            resultado.reporte_id = accion["reporte_id"]
            state.registrar_accion("reporte_vial_creado", {"id": accion["reporte_id"], "estado": accion["estado"]})

        state.context["vial"] = resultado
        log.info("Agente Vial completado", severidad=resultado.severidad)
        return resultado
