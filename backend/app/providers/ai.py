from google import genai
from google.genai import types
from app.core.config import get_settings
import structlog
import asyncio
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

settings = get_settings()
log = structlog.get_logger()

# Inicializar cliente si hay API key
client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

class AIProvider:
    def __init__(self):
        self.model_fast = "gemini-3.5-flash-lite"
        self.model_smart = "gemini-3.5-flash"
        
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        reraise=True
    )
    async def generate_structured(self, prompt: str, response_schema: type, model: str = None, system_instruction: str = None, contents=None):
        if not client:
            log.warning("Intento de usar IA sin GEMINI_API_KEY configurada")
            raise ValueError("GEMINI_API_KEY no configurada")

        target_model = model or self.model_fast
        
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            system_instruction=system_instruction,
            temperature=0.1
        )
        
        # Async run in thread pool as sync client is used or async client directly
        loop = asyncio.get_running_loop()
        
        # Build contents
        req_contents = contents if contents else [prompt]
        
        def _call_api():
            return client.models.generate_content(
                model=target_model,
                contents=req_contents,
                config=config
            )
            
        try:
            response = await loop.run_in_executor(None, _call_api)
            # Validar que cumpla con el esquema pasandolo por Pydantic
            # El SDK actual lo devuelve como JSON string
            import json
            data = json.loads(response.text)
            return response_schema.model_validate(data)
        except Exception as e:
            log.error("Error llamando a Gemini", error=str(e), model=target_model)
            raise
            
ai_provider = AIProvider()
