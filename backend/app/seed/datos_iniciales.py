import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import AsyncSessionLocal, engine
from app.models.base import Base
from sqlalchemy import text
from app.models.domain import Lugar, Especialidad, LugarEspecialidad, GuiaEstabilizacion, PuntoInteres
import json

async def seed_data():
    # Asegurar que las tablas existan antes del seed
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT count(*) FROM lugares"))
        count = result.scalar()
        if count > 0:
            print("Datos iniciales ya existen. Saltando seed.")
            return

        print("Insertando datos iniciales de ORBIS (Bogotá)...")

        # 1. Especialidades
        especialidades_nombres = [
            "Cardiología", "Neurología", "Ortopedia", "Pediatría", "Medicina General",
            "Gastroenterología", "Toxicología", "Neumología", "Psiquiatría", "Odontología"
        ]
        especialidades = []
        for nombre in especialidades_nombres:
            esp = Especialidad(nombre=nombre)
            session.add(esp)
            especialidades.append(esp)
        await session.commit()
        for esp in especialidades:
            await session.refresh(esp)
        
        esp_map = {e.nombre: e.id for e in especialidades}

        # 2. Lugares de Salud
        lugares_salud = [
            Lugar(nombre="Fundación Santa Fe de Bogotá", categoria="clinica", lat=4.6946, lon=-74.0322, direccion="Cra. 9 #116-20", telefono=None),
            Lugar(nombre="Hospital Universitario San Ignacio", categoria="hospital", lat=4.6288, lon=-74.0645, direccion="Cra. 7 #40-62", telefono="601 5946161"),
            Lugar(nombre="Clínica del Country", categoria="clinica", lat=4.6672, lon=-74.0558, direccion="Cra. 16 #82-57", telefono="601 5300470"),
        ]
        session.add_all(lugares_salud)
        await session.commit()

        # Asignar especialidades
        for l in lugares_salud:
            await session.refresh(l)
            # Agregar cardiologia a todos por simplicidad
            session.add(LugarEspecialidad(lugar_id=l.id, especialidad_id=esp_map["Cardiología"]))
            session.add(LugarEspecialidad(lugar_id=l.id, especialidad_id=esp_map["Medicina General"]))
        
        # 3. Lugares de Comida (Sabor)
        lugares_comida = [
            Lugar(nombre="Andrés Carne de Res", categoria="restaurante", subcategoria="carnes", lat=4.6675, lon=-74.0535, direccion="CC El Retiro", precio_promedio=80000, rango_precio="alto", rating=4.5),
            Lugar(nombre="Wok", categoria="restaurante", subcategoria="asiatica", lat=4.6541, lon=-74.0592, direccion="Zona G", precio_promedio=45000, rango_precio="medio", rating=4.7),
            Lugar(nombre="El Corral", categoria="restaurante", subcategoria="hamburguesas", lat=4.6097, lon=-74.0817, direccion="Centro", precio_promedio=25000, rango_precio="bajo", rating=4.0),
        ]
        session.add_all(lugares_comida)

        # 4. Talleres / Montallantas
        lugares_taller = [
            Lugar(nombre="Taller Autorizado Toyota", categoria="taller", subcategoria="mecanica", lat=4.6811, lon=-74.0436, direccion="Calle 100 # 15-20", horario="L-V 8am-5pm"),
            Lugar(nombre="Montallantas El Rápido", categoria="montallantas", subcategoria="llantas", lat=4.6432, lon=-74.0934, direccion="Av. Boyacá con Calle 26", horario="24 horas"),
        ]
        session.add_all(lugares_taller)

        # 5. Puntos de Interés (Explora)
        puntos_turismo = [
            PuntoInteres(nombre="Museo del Oro", categoria="museo", descripcion="Mayor colección de orfebrería prehispánica del mundo.", lat=4.6019, lon=-74.0719, horario="M-S 9am-6pm", costo_entrada=5000),
            PuntoInteres(nombre="Monserrate", categoria="mirador", descripcion="Cerro tutelar de la ciudad con santuario.", lat=4.6053, lon=-74.0556, horario="L-D 6am-11pm", costo_entrada=27000),
            PuntoInteres(nombre="Plaza de Bolívar", categoria="plaza", descripcion="Plaza principal de Bogotá, rodeada de edificios históricos.", lat=4.5981, lon=-74.0760, horario="24 horas", costo_entrada=0),
            PuntoInteres(nombre="Catedral Primada de Colombia", categoria="iglesia", descripcion="Catedral católica en la Plaza de Bolívar.", lat=4.5983, lon=-74.0758, horario="L-D 8am-5pm", costo_entrada=0),
        ]
        session.add_all(puntos_turismo)

        # 6. Guías de estabilización (Salud)
        guias = [
            GuiaEstabilizacion(
                condicion="Dolor torácico / Infarto",
                pasos=json.dumps(["Siéntate o recuéstate inmediatamente.", "Afloja cualquier ropa ajustada.", "Masticar una aspirina (si no es alérgico)."]),
                que_no_hacer=json.dumps(["No conduzcas al hospital por ti mismo.", "No comas ni bebas nada."]),
                especialidad_id=esp_map["Cardiología"]
            ),
            GuiaEstabilizacion(
                condicion="Hemorragia severa",
                pasos=json.dumps(["Aplica presión directa sobre la herida con un paño limpio.", "Eleva la zona afectada si es posible."]),
                que_no_hacer=json.dumps(["No retires objetos incrustados.", "No apliques torniquetes a menos que estés entrenado."]),
                especialidad_id=esp_map["Medicina General"]
            )
        ]
        session.add_all(guias)

        await session.commit()
        print("Datos iniciales insertados correctamente.")

if __name__ == "__main__":
    asyncio.run(seed_data())
