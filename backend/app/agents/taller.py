from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoTaller
from app.tools.local import evaluar_riesgo_vehicular, consultar_lugares_propios
from app.tools.actions import crear_solicitud_asistencia
import structlog
import json

log = structlog.get_logger()

class TallerAgent(BaseAgent):
    def __init__(self):
        super().__init__("TallerAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        texto = state.context.get("texto_usuario", "")
        ubicacion = state.context.get("ubicacion")
        
        # 1. Reglas deterministas
        eval_riesgo = evaluar_riesgo_vehicular(texto)
        if eval_riesgo["hay_riesgo"]:
            log.warning("Riesgo vehicular detectado", riesgos=eval_riesgo["riesgos"])
            
        lat = ubicacion.lat if ubicacion else 4.6097
        lon = ubicacion.lon if ubicacion else -74.0817
        
        talleres = await consultar_lugares_propios("taller", lat, lon, radio_m=15000)
        montallantas = await consultar_lugares_propios("montallantas", lat, lon, radio_m=15000)
        lugares = talleres + montallantas
        lugares.sort(key=lambda x: x["distancia_m"])
        lugares = lugares[:5]
        
        system_instruction = """
        Eres el agente de Taller de ORBIS. Orientas sobre problemas mecánicos de vehículos.
        Tu tarea es determinar la falla probable, la urgencia (alta, media, baja), si el vehículo 
        se puede seguir conduciendo, los pasos de seguridad y sugerir talleres o montallantas cercanos.
        
        Si hay riesgo inminente (humo, fuego, falla de frenos), la urgencia es 'alta', 
        puede_conducir es 'false', y DEBES indicar que llamen al 123 y se alejen del vehículo.
        
        Calcula duracion_s aproximada para llegar al taller (180s por km).
        
        REGLA: SIEMPRE debes retornar AL MENOS 3 talleres sugeridos de la lista proporcionada.
        """
        
        alertas_comunitarias = "\n".join(state.context.get("alertas_comunitarias", []))
        alerta_text = f"ALERTAS EN LA ZONA:\n{alertas_comunitarias}\nConsidera advertir al usuario si es relevante." if alertas_comunitarias else ""
        
        prompt = f"""
        Falla o situación reportada: '{texto}'
        {alerta_text}
        
        Talleres cercanos disponibles:
        {json.dumps(lugares, indent=2)}
        """
        
        resultado: ResultadoTaller = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoTaller,
            system_instruction=system_instruction
        )
        
        # Acción: Crear solicitud de asistencia
        accion = await crear_solicitud_asistencia(
            caso_id=state.caso_id,
            tipo_vehiculo=resultado.tipo_vehiculo,
            falla_probable=resultado.falla_probable,
            urgencia=resultado.urgencia,
            puede_conducir=resultado.puede_conducir
        )
        resultado.solicitud_id = accion["solicitud_id"]
        
        state.context["taller"] = resultado
        log.info("Agente Taller completado", falla=resultado.falla_probable)
