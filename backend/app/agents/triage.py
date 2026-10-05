from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoTriage
import structlog

log = structlog.get_logger()

INTENCIONES = {"vial", "salud", "comida", "taller", "explora", "indefinido"}


class TriageAgent(BaseAgent):
    """Clasifica el caso (texto + imagen) y evalúa si la información alcanza para continuar."""

    def __init__(self):
        super().__init__("TriageAgent")

    async def _process(self, state: OrchestratorState):
        texto = state.context.get("texto_usuario", "")
        imagen_path = state.context.get("imagen_path")

        system_instruction = """
        Eres el agente de Triage de ORBIS (Asistente Urbano Inteligente para la ciudad de Bogotá).
        Analiza la entrada del usuario (texto y, si existe, imagen) y determina a qué módulo pertenece:
        - 'vial': Huecos, semáforos dañados, problemas en la vía pública.
        - 'salud': Síntomas médicos, emergencias médicas, orientación de salud.
        - 'comida' (Sabor): Antojos, recomendaciones de restaurantes.
        - 'taller': Problemas mecánicos del vehículo, varadas, testigos encendidos.
        - 'explora': Identificar lugares turísticos, pedir recorridos, turismo.
        - 'indefinido': Si no encaja en nada de lo anterior.

        Evalúa la calidad de la información en calidad_informacion:
        - suficiente=false si falta lo mínimo para ayudar (p. ej. salud sin síntomas, taller sin describir la falla,
          reporte vial sin ninguna ubicación: ni GPS ni dirección).
          Indica en datos_faltantes qué debe agregar el usuario.
        - contradicciones: si la imagen NO coincide con el texto (p. ej. dice "hueco" y la foto es un plato de comida),
          o si el texto se contradice a sí mismo, descríbelo aquí.
        - fuera_de_contexto=true si la solicitud no tiene relación con movilidad o servicios urbanos.
        Si hay imagen, describe objetivamente en observacion_imagen lo que se ve. Si no hay imagen, deja ese campo vacío.
        Identifica entidades relevantes (barrios, síntomas, comidas, vehículos, lugares).
        """

        if state.context.get("direccion_texto"):
            info_ubicacion = f"El usuario escribió la dirección: '{state.context['direccion_texto']}'."
        elif state.context.get("lat") is not None:
            info_ubicacion = "La ubicación GPS del dispositivo SÍ está disponible; no la pidas como dato faltante."
        else:
            info_ubicacion = "El usuario NO compartió su ubicación."

        prompt = f"Texto del usuario: '{texto}'\n{info_ubicacion}"
        if imagen_path:
            prompt += "\nEl usuario adjuntó la imagen incluida en este mensaje."

        resultado: ResultadoTriage = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoTriage,
            system_instruction=system_instruction,
            imagen_path=imagen_path
        )

        if resultado.intencion not in INTENCIONES:
            resultado.intencion = "indefinido"

        state.context["triage"] = resultado
        log.info("Triage completado", intencion=resultado.intencion, confianza=resultado.confianza)
        return resultado
