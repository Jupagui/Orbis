import asyncio
from app.providers.ai import ai_provider
from pydantic import BaseModel

class TestResponse(BaseModel):
    message: str

async def main():
    try:
        res = await ai_provider.generate_structured(
            prompt="Di hola",
            response_schema=TestResponse
        )
        print("Success:", res)
    except Exception as e:
        print("Exception:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
