"""Carga 10 casos de salud de ejemplo, completos y con el mismo formato que produce el pipeline.

Los casos quedan marcados en su verificación como "caso de ejemplo cargado manualmente": no pasaron por
Gemini ni por los agentes, así que no tienen trazas y las distancias son en línea recta (no son rutas reales).
Los centros son los hospitales y clínicas de la tabla `lugares`.

Uso:  python seed_casos_salud.py
"""
import asyncio
import json
import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.domain import Caso, Lugar, Recomendacion

AVISO = "Esta orientación no reemplaza la valoración médica."
NOTA = "Caso de ejemplo cargado manualmente: no fue procesado por los agentes y las distancias son en línea recta."

# (descripción, dirección, lat, lon, urgencia, especialidad, señales, qué hacer, qué no hacer)
CASOS = [
    ("Mi papá tiene dolor fuerte en el pecho y le duele el brazo izquierdo", "Carrera 13 # 63-39, Chapinero", 4.6480, -74.0640, "emergencia", "Cardiología",
     ["Posible infarto"], ["Llama a la línea de emergencias 123.", "Sienta a la persona y manténla en reposo.", "Afloja la ropa ajustada."], ["No lo dejes solo.", "No le des de comer ni de beber."]),
    ("Mi hijo de 4 años tiene fiebre de 39,5 desde anoche y no quiere comer", "Calle 140 # 11-45, Usaquén", 4.7200, -74.0300, "media", "Pediatría",
     ["Fiebre alta persistente en un menor"], ["Dale líquidos en pequeñas cantidades.", "Mantén al niño con ropa ligera.", "Consulta pediatría hoy."], ["No lo abrigues en exceso.", "No le des medicamentos sin indicación médica."]),
    ("Me corté la mano con un vidrio y la herida sangra mucho, no para", "Avenida 68 # 24-15, Puente Aranda", 4.6310, -74.1050, "emergencia", "Urgencias",
     ["Hemorragia severa"], ["Llama a la línea de emergencias 123.", "Presiona la herida con un paño limpio.", "Mantén la mano elevada."], ["No retires el paño si se empapa: pon otro encima.", "No apliques remedios caseros."]),
    ("Tengo dolor de cabeza leve desde la mañana y algo de cansancio", "Calle 53 # 21-10, Teusaquillo", 4.6440, -74.0700, "baja", "Medicina general",
     [], ["Descansa en un lugar tranquilo.", "Hidrátate bien.", "Si empeora o dura más de 2 días, consulta."], ["No tomes varios medicamentos a la vez.", "No ignores síntomas que empeoren."]),
    ("A mi abuela le cuesta respirar y se le ponen los labios morados", "Carrera 80 # 8-50, Kennedy", 4.6360, -74.1560, "emergencia", "Neumología",
     ["Dificultad respiratoria aguda"], ["Llama a la línea de emergencias 123.", "Siéntala con la espalda recta.", "Abre ventanas para que circule el aire."], ["No la acuestes boca arriba.", "No la dejes sola."]),
    ("Me torcí el tobillo jugando fútbol, está hinchado y me duele al pisar", "Parque Simón Bolívar, Teusaquillo", 4.6580, -74.0930, "media", "Ortopedia",
     ["Hinchazón con dolor al apoyar el pie"], ["Aplica frío 15 minutos con un paño de por medio.", "Mantén el pie elevado.", "Evita apoyar el pie."], ["No masajees la zona.", "No apliques calor."]),
    ("Tengo náuseas, vómito y diarrea desde ayer después de comer en la calle", "Calle 19 # 4-20, La Candelaria", 4.6020, -74.0690, "media", "Medicina general",
     ["Deshidratación posible"], ["Toma suero oral o líquidos a sorbos.", "Descansa.", "Consulta si hay sangre en las heces o no retienes líquidos."], ["No tomes antidiarreicos sin indicación.", "No comas alimentos grasosos."]),
    ("Mi vecino se desmayó unos segundos y ahora está pálido y confundido", "Carrera 7 # 116-30, Usaquén", 4.6960, -74.0330, "alta", "Medicina interna",
     ["Pérdida de conciencia reciente", "Confusión"], ["Llama a la línea de emergencias 123.", "Acuéstalo con las piernas elevadas.", "Vigila que respire con normalidad."], ["No le des de beber mientras esté confuso.", "No lo levantes de golpe."]),
    ("Tengo una picadura de abeja en el brazo, me duele y se ve algo roja", "Calle 72 # 10-07, Chapinero", 4.6590, -74.0560, "baja", "Medicina general",
     [], ["Retira el aguijón raspando con una tarjeta.", "Lava con agua y jabón.", "Aplica frío."], ["No aprietes la zona.", "Si hay hinchazón de cara o falta de aire, llama al 123."]),
    ("Mi mamá tiene la presión alta, mareo fuerte y dolor de cabeza intenso", "Avenida Boyacá # 80-94, Engativá", 4.6870, -74.1090, "alta", "Cardiología",
     ["Presión alta con síntomas neurológicos"], ["Que se siente y descanse.", "Toma la presión si tienes tensiómetro.", "Acude a urgencias de inmediato."], ["No la dejes caminar sola.", "No le des medicamentos sin indicación médica."]),
]

PRIORIDAD = {"emergencia": "critica", "alta": "alta", "media": "media", "baja": "baja"}


def distancia_m(lat1, lon1, lat2, lon2):
    """Línea recta entre dos puntos (haversine). No es una ruta."""
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return int(2 * r * math.asin(math.sqrt(a)))


async def main():
    async with AsyncSessionLocal() as sesion:
        centros = (await sesion.execute(select(Lugar).where(Lugar.categoria.in_(["hospital", "clinica"])))).scalars().all()
        if not centros:
            raise SystemExit("No hay hospitales ni clínicas en la tabla lugares.")
        ahora = datetime.now(timezone.utc)

        for i, (texto, direccion, lat, lon, urgencia, especialidad, alarmas, hacer, no_hacer) in enumerate(CASOS):
            cercanos = sorted(centros, key=lambda c: distancia_m(lat, lon, c.lat, c.lon))[:3]
            lista = [{
                "nombre": c.nombre, "distancia_m": distancia_m(lat, lon, c.lat, c.lon), "duracion_s": 0,
                "lat": c.lat, "lon": c.lon, "ruta_verificada": False, "telefono": c.telefono, "fuente": "propia",
            } for c in cercanos]
            caso = Caso(
                tipo="salud", estado="completado", descripcion=texto, lat=lat, lon=lon, direccion=direccion,
                prioridad=PRIORIDAD[urgencia], creado_en=ahora - timedelta(hours=3 * (i + 1)),
            )
            caso.resultado_json = json.dumps({
                "caso_id": "pendiente", "intencion": "salud", "confianza": 0.9, "resumen": texto,
                "observacion_imagen": None,
                "ubicacion": {"texto": direccion, "lat": lat, "lon": lon, "barrio": direccion.split(",")[-1].strip(), "fuente": "gps"},
                "calidad_informacion": {"suficiente": True, "contradicciones": [], "datos_faltantes": [], "fuera_de_contexto": False},
                "salud": {
                    "nivel_urgencia": urgencia, "especialidad_sugerida": especialidad, "senales_alarma": alarmas,
                    "recomendaciones_estabilizacion": hacer, "que_no_hacer": no_hacer, "centros": lista, "aviso": AVISO,
                },
                "vial": None, "sabor": None, "taller": None, "explora": None,
                "acciones": [],
                "verificacion": {"aprobado": True, "advertencias": [NOTA, "Algunas distancias no se pudieron confirmar con el servicio de mapas."], "lugares_descartados": [], "fuentes": []},
                "prioridad": PRIORIDAD[urgencia],
            }, ensure_ascii=False)
            sesion.add(caso)
            await sesion.flush()

            # La acción de Salud: guardar la recomendación del centro más cercano
            elegido, datos = cercanos[0], lista[0]
            rec = Recomendacion(caso_id=caso.id, lugar_id=elegido.id, fuente="propia", distancia_m=datos["distancia_m"],
                                duracion_s=0, motivo=f"{especialidad} · urgencia {urgencia}", seleccionada=True)
            sesion.add(rec)
            await sesion.flush()
            resultado = json.loads(caso.resultado_json)
            resultado["caso_id"] = caso.id
            resultado["acciones"] = [{"tipo": "recomendacion_guardada", "id": rec.id, "lugar": elegido.nombre}]
            caso.resultado_json = json.dumps(resultado, ensure_ascii=False)

        await sesion.commit()
        total = len((await sesion.execute(select(Caso).where(Caso.tipo == "salud"))).scalars().all())
        print(f"{len(CASOS)} casos de salud insertados. Total de casos de salud: {total}.")


if __name__ == "__main__":
    asyncio.run(main())
