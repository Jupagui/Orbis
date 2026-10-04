from app.orchestrator.state import BaseAgent, OrchestratorState
from app.schemas.domain import RespuestaFinal
import structlog

log = structlog.get_logger()

class VerificadorAgent(BaseAgent):
    def __init__(self):
        super().__init__("VerificadorAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        triage = state.context.get("triage")
        ubicacion = state.context.get("ubicacion")
        
        intencion = triage.intencion if triage else "indefinido"
        
        # El verificador en un caso real llamaría al LLM para sintetizar todo.
        # Aquí, como los agentes de dominio ya devolvieron JSON estructurado final,
        # el Verificador solo ensambla el objeto RespuestaFinal.
        
        respuesta = RespuestaFinal(
            caso_id=state.caso_id,
            intencion=intencion,
            confianza=triage.confianza if triage else 0.0,
            resumen=triage.resumen if triage else "",
            observacion_imagen=triage.observacion_imagen if triage else None,
            ubicacion=ubicacion,
            calidad_informacion=triage.calidad_informacion if triage else None
        )
        
        # Asignar el bloque de dominio correspondiente
        if intencion == "vial" and "vial" in state.context:
            respuesta.vial = state.context["vial"]
        elif intencion == "salud" and "salud" in state.context:
            respuesta.salud = state.context["salud"]
        elif intencion == "comida" and "sabor" in state.context:
            respuesta.sabor = state.context["sabor"]
        elif intencion == "taller" and "taller" in state.context:
            respuesta.taller = state.context["taller"]
        elif intencion == "explora" and "explora" in state.context:
            respuesta.explora = state.context["explora"]
            
        state.context["respuesta_final"] = respuesta
        log.info("Agente Verificador ensambló la respuesta final")
