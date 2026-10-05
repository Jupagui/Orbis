from google import genai
from google.genai import types
from app.core.config import get_settings
import structlog
import asyncio
import json
import mimetypes
from pathlib import Path
from tenacity import retry, wait_exponential, stop_after_attempt

settings = get_settings()
log = structlog.get_logger()

# Inicializar cliente si hay API key
client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None


def imagen_a_part(imagen_path: str) -> types.Part:
    """Convierte una imagen guardada en disco en un Part que Gemini puede ver."""
    ruta = Path(imagen_path)
    mime_type = mimetypes.guess_type(ruta.name)[0] or "image/jpeg"
    return types.Part.from_bytes(data=ruta.read_bytes(), mime_type=mime_type)


class AIProvider:
    def __init__(self):
        # El modelo se define en .env (GEMINI_MODEL) para poder cambiarlo sin tocar código
        self.model = settings.GEMINI_MODEL
        self.respaldos = [m.strip() for m in settings.GEMINI_MODELOS_RESPALDO.split(",") if m.strip()]

    def _require_client(self):
        if not client:
            log.warning("Intento de usar IA sin GEMINI_API_KEY configurada")
            raise ValueError("GEMINI_API_KEY no configurada")

    @staticmethod
    def _es_saturacion(e: Exception) -> bool:
        """Errores temporales del lado de Google en los que vale la pena cambiar de modelo."""
        texto = str(e).upper()
        return any(s in texto for s in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "OVERLOADED",
                                        "HIGH DEMAND", "404", "NOT_FOUND"))

    async def _llamar_con_respaldo(self, modelo_principal: str, contents, config):
        """Prueba el modelo principal y, si está saturado, los de respaldo en orden."""
        modelos = [modelo_principal] + [m for m in self.respaldos if m != modelo_principal]
        ultimo_error = None
        for modelo in modelos:
            def _call_api(m=modelo):
                return client.models.generate_content(model=m, contents=contents, config=config)
            try:
                respuesta = await asyncio.get_running_loop().run_in_executor(None, _call_api)
                if modelo != modelo_principal:
                    log.info("Respuesta obtenida con modelo de respaldo", modelo=modelo)
                return respuesta
            except Exception as e:
                ultimo_error = e
                if not self._es_saturacion(e):
                    raise
                log.warning("Modelo saturado o no disponible, probando respaldo", modelo=modelo, error=str(e)[:150])
        raise ultimo_error

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        reraise=True
    )
    async def generate_structured(self, prompt: str, response_schema: type, model: str = None,
                                  system_instruction: str = None, imagen_path: str = None):
        """Llama a Gemini y obliga a que la respuesta cumpla el esquema Pydantic indicado."""
        self._require_client()
        target_model = model or self.model

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            system_instruction=system_instruction,
            temperature=0.1
        )

        # Multimodal: si hay imagen, se envía junto con el texto
        contents = [imagen_a_part(imagen_path), prompt] if imagen_path else [prompt]

        try:
            response = await self._llamar_con_respaldo(target_model, contents, config)
            # Validar que cumpla con el esquema pasándolo por Pydantic
            return response_schema.model_validate(json.loads(response.text))
        except Exception as e:
            log.error("Error llamando a Gemini", error=str(e), model=target_model)
            raise

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        reraise=True
    )
    async def generate_chat(self, system_instruction: str, historial: list[dict], pregunta: str) -> str:
        """Respuesta en texto libre para el chat contextual.
        historial: [{"rol": "usuario"|"asistente", "contenido": "..."}]"""
        self._require_client()

        contents = [
            types.Content(role="user" if m["rol"] == "usuario" else "model",
                          parts=[types.Part.from_text(text=m["contenido"])])
            for m in historial
        ]
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=pregunta)]))

        config = types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.2)

        response = await self._llamar_con_respaldo(self.model, contents, config)
        return response.text


ai_provider = AIProvider()
