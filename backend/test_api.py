import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/v1/casos",
                data={
                    "descripcion": "Prueba desde python",
                    "lat": 4.6097,
                    "lon": -74.0817,
                }
            )
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(main())
