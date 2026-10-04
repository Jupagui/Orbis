from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoVial
from app.tools.actions import crear_reporte_vial
import structlog

log = structlog.get_logger()

class VialAgent(BaseAgent):
    def __init__(self):
        super().__init__("VialAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        texto = state.context.get("texto_usuario", "")
        ubicacion = state.context.get("ubicacion")
        
        system_instruction = """
        Eres el agente Vial de ORBIS. Tu tarea es diagnosticar un problema reportado en la vía pública
        (huecos, semáforos, señalización, escombros) y determinar la severidad, riesgo y entidad sugerida para resolverlo.
        """
        
        prompt = f"""
        Problema reportado: '{texto}'
        
        Dirección/Ubicación: '{ubicacion.texto if ubicacion else "Desconocida"}'
        """
        
        resultado: ResultadoVial = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoVial,
            system_instruction=system_instruction
        )
        
        # Acción: Crear el reporte vial en BD
        if ubicacion and ubicacion.lat and ubicacion.lon:
            accion = await crear_reporte_vial(
                caso_id=state.caso_id,
                tipo_problema=resultado.tipo_problema,
                severidad=resultado.severidad,
                lat=ubicacion.lat,
                lon=ubicacion.lon,
                direccion=ubicacion.texto,
                barrio=getattr(ubicacion, "barrio", None)
            )
            resultado.reporte_id = accion["reporte_id"]
            
        state.context["vial"] = resultado
        log.info("Agente Vial completado", severidad=resultado.severidad)
