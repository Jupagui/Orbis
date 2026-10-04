from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoSalud
from app.tools.local import evaluar_senales_alarma, consultar_lugares_propios, consultar_guias_estabilizacion
import structlog
import json

log = structlog.get_logger()

class SaludAgent(BaseAgent):
    def __init__(self):
        super().__init__("SaludAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        texto = state.context.get("texto_usuario", "")
        ubicacion = state.context.get("ubicacion")
        
        # 1. Reglas deterministas (Chain of Responsibility)
        eval_alarma = evaluar_senales_alarma(texto)
        if eval_alarma["hay_alarma"]:
            log.warning("Alarma detectada por reglas", alarmas=eval_alarma["alarmas"])
            # Fallback rápido
            
        # 2. Consultar datos
        lat = ubicacion.lat if ubicacion else 4.6097
        lon = ubicacion.lon if ubicacion else -74.0817
        
        # Hospitales y clínicas cercanas (radio grande 10km)
        hospitales = await consultar_lugares_propios("hospital", lat, lon, radio_m=10000)
        clinicas = await consultar_lugares_propios("clinica", lat, lon, radio_m=10000)
        centros = hospitales + clinicas
        centros.sort(key=lambda x: x["distancia_m"])
        centros = centros[:5] # Tomar los 5 más cercanos
        
        guias = await consultar_guias_estabilizacion()
        
        system_instruction = """
        Eres el agente de Salud de ORBIS. Tu tarea es orientar al usuario en una situación de salud.
        REGLA CRÍTICA: NO diagnosticas. Tu función es clasificar la urgencia (baja, media, alta, emergencia),
        sugerir a qué especialidad debería acudir, identificar señales de alarma, y proveer recomendaciones
        de estabilización basadas ESTRICTAMENTE en la información de contexto proveída.
        
        Si el nivel de urgencia es 'emergencia' o 'alta', DEBES recomendar llamar al 123 y acudir al centro más cercano.
        Para cada centro que devuelvas, calcula una duracion_s aproximada (asume 3 min por cada 1 km = 180s/km).
        
        REGLA: SIEMPRE debes retornar AL MENOS 3 centros médicos sugeridos de la lista proporcionada.
        """
        
        alertas_comunitarias = "\n".join(state.context.get("alertas_comunitarias", []))
        alerta_text = f"ALERTAS EN LA ZONA:\n{alertas_comunitarias}\nConsidera advertir al usuario si es relevante." if alertas_comunitarias else ""
        
        prompt = f"""
        Síntomas reportados: '{texto}'
        {alerta_text}
        
        Centros médicos cercanos disponibles (usa solo estos):
        {json.dumps(centros, indent=2)}
        
        Guías de estabilización disponibles:
        {json.dumps(guias, indent=2)}
        """
        
        resultado: ResultadoSalud = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoSalud,
            system_instruction=system_instruction
        )
        
        # TODO: Invocar action para guardar la recomendación aquí si se requiere persistencia pre-verificador
        
        state.context["salud"] = resultado
        log.info("Agente Salud completado", urgencia=resultado.nivel_urgencia)
