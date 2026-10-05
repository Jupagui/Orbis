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

    def _require_client(self):
        if not client:
            log.warning("Intento de usar IA sin GEMINI_API_KEY configurada")
            raise ValueError("GEMINI_API_KEY no configurada")

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

        def _call_api():
            return client.models.generate_content(model=target_model, contents=contents, config=config)

        try:
            response = await asyncio.get_running_loop().run_in_executor(None, _call_api)
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

        def _call_api():
            return client.models.generate_content(model=self.model, contents=contents, config=config)

        response = await asyncio.get_running_loop().run_in_executor(None, _call_api)
        return response.text


ai_provider = AIProvider()
