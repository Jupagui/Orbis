from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoTriage
import structlog

log = structlog.get_logger()

class TriageAgent(BaseAgent):
    def __init__(self):
        super().__init__("TriageAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        texto = state.context.get("texto_usuario", "")
        imagen_path = state.context.get("imagen_path")
        
        system_instruction = """
        Eres el agente de Triage de ORBIS (Asistente Urbano Inteligente para la ciudad de Bogotá).
        Tu tarea es analizar la entrada del usuario (texto y opcionalmente imagen) y determinar a qué módulo pertenece:
        - 'vial': Huecos, semáforos dañados, problemas en la vía pública.
        - 'salud': Síntomas médicos, emergencias médicas, orientación de salud.
        - 'comida' (Sabor): Antojos, recomendaciones de restaurantes.
        - 'taller': Problemas mecánicos del vehículo, varadas, testigos encendidos.
        - 'explora': Identificar lugares turísticos, pedir recorridos, turismo.
        - 'indefinido': Si no encaja en nada de lo anterior o falta demasiada información.
        
        Analiza también la calidad de la información. Si el usuario pide ayuda de salud o mecánica, necesitas síntomas o el tipo de falla. Si falta contexto, pon suficiente=false.
        Identifica cualquier entidad relevante (barrios, síntomas, comidas, etc).
        """
        
        prompt = f"Texto del usuario: '{texto}'"
        if imagen_path:
            prompt += f"\n(Se ha adjuntado una imagen que puedes ver en los contenidos)."
            
        # TODO: Implement image passing to gemini via file path if needed in 'contents'
        # For now, we pass just the prompt
        
        resultado: ResultadoTriage = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoTriage,
            system_instruction=system_instruction
        )
        
        state.context["triage"] = resultado
        log.info("Triage completado", intencion=resultado.intencion, confianza=resultado.confianza)
