import asyncio
import random
import json
from app.core.db import AsyncSessionLocal
from app.models.domain import Caso

async def seed_100_casos():
    async with AsyncSessionLocal() as session:
        # Bogota boundaries roughly: lat 4.55 to 4.75, lon -74.15 to -74.00
        for i in range(100):
            lat = round(random.uniform(4.55, 4.75), 5)
            lon = round(random.uniform(-74.15, -74.00), 5)
            
            caso = Caso(
                descripcion="Accidente simulado",
                estado="completado",
                tipo="vial",
                lat=lat,
                lon=lon,
                resultado_json=json.dumps({
                    "resumen": "Reporte vial simulado",
                    "nivel_urgencia": random.choice(["baja", "media", "alta"]),
                    "descripcion": "Problema reportado en vía pública."
                })
            )
            session.add(caso)
        
        await session.commit()
        print("100 casos viales insertados exitosamente.")

if __name__ == "__main__":
    asyncio.run(seed_100_casos())
