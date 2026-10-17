"""Carga datos de prueba en TODAS las tablas de orbis.db. Se puede ejecutar varias veces: no duplica.

Qué se agrega
- especialidades, lugares (hospitales, restaurantes, talleres), lugar_especialidad, guias_estabilizacion, puntos_interes
- 16 casos (vial, taller, comida, explora, salud sin datos suficientes y un error) con sus tablas hijas:
  reportes_viales, solicitudes_asistencia, recomendaciones, recorridos, paradas_recorrido, mensajes_chat y trazas.

Aviso: son datos de prueba. Los casos no pasaron por Gemini ni por los agentes; sus trazas están marcadas con
"_prueba": true y sus distancias son en línea recta. Las coordenadas, horarios y precios de los lugares reales
son aproximados, y los talleres de prueba son inventados (su nombre termina en «· prueba»). Los lugares nuevos
no tienen teléfono a propósito, para no mostrar números falsos.

Uso:  python seed_datos_prueba.py
"""
import asyncio
import json
import math
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.domain import (
    Caso, Especialidad, GuiaEstabilizacion, Lugar, LugarEspecialidad, MensajeChat, ParadaRecorrido,
    PuntoInteres, Recomendacion, Recorrido, ReporteVial, SolicitudAsistencia, Traza,
)

NS = uuid.UUID("0b7a3c1e-6f42-4c1d-9a55-0000000000b1")
NOTA = "Caso de ejemplo cargado manualmente: no fue procesado por los agentes y las distancias son en línea recta."
AHORA = datetime.now(timezone.utc)


def j(x):
    return json.dumps(x, ensure_ascii=False)


def dist(a, b, c, d):
    """Línea recta en metros (haversine). No es una ruta."""
    p1, p2 = math.radians(a), math.radians(c)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b) / 2) ** 2
    return int(2 * 6371000 * math.asin(math.sqrt(h)))


# ----------------------------------------------------------------- catálogos
ESPECIALIDADES = ["Dermatología", "Oftalmología", "Otorrinolaringología", "Ginecología y Obstetricia", "Urología", "Medicina Interna", "Urgencias"]

# (nombre, categoria, subcategoria, lat, lon, direccion, precio, rango, rating, horario, especialidades)
LUGARES = [
    ("Hospital Universitario Mayor Méderi", "hospital", None, 4.6290, -74.0800, "Calle 24 # 29-45", None, None, None, "24 horas", ["Urgencias", "Medicina Interna", "Cardiología"]),
    ("Hospital Simón Bolívar", "hospital", None, 4.7511, -74.0396, "Calle 165 # 7-06", None, None, None, "24 horas", ["Urgencias", "Pediatría", "Medicina General"]),
    ("Hospital de Kennedy", "hospital", None, 4.6275, -74.1580, "Av. Calle 38 Sur # 86", None, None, None, "24 horas", ["Urgencias", "Medicina General", "Ortopedia"]),
    ("Hospital Santa Clara", "hospital", None, 4.5900, -74.0810, "Carrera 14 Sur, San Cristóbal", None, None, None, "24 horas", ["Urgencias", "Neumología", "Medicina Interna"]),
    ("Clínica Reina Sofía", "clinica", None, 4.6975, -74.0530, "Carrera 21 # 114-52", None, None, None, "24 horas", ["Urgencias", "Cardiología", "Neurología"]),
    ("Clínica Marly", "clinica", None, 4.6400, -74.0650, "Calle 50 # 9-67", None, None, None, "24 horas", ["Urgencias", "Ortopedia", "Gastroenterología"]),
    ("Crepes & Waffles Calle 82", "restaurante", "internacional", 4.6665, -74.0545, "Calle 82", 38000, "medio", 4.4, "L-D 8am-10pm", []),
    ("La Puerta Falsa", "restaurante", "colombiana", 4.5978, -74.0765, "Calle 11 # 6-50, La Candelaria", 18000, "bajo", 4.5, "L-D 9am-8pm", []),
    ("Harry Sasson", "restaurante", "internacional", 4.6610, -74.0560, "Calle 79B # 7-52", 120000, "alto", 4.6, "L-S 12pm-11pm", []),
    ("Leo Cocina y Cava", "restaurante", "colombiana", 4.6120, -74.0640, "Calle 27B # 6-75", 140000, "alto", 4.7, "L-S 12pm-10pm", []),
    ("Home Burger Zona T", "restaurante", "hamburguesas", 4.6665, -74.0540, "Zona T", 38000, "medio", 4.4, "L-D 12pm-11pm", []),
    ("Frisby Chapinero", "restaurante", "pollo", 4.6500, -74.0620, "Chapinero", 28000, "bajo", 4.1, "L-D 10am-10pm", []),
    ("Taller y Lubricentro Calle 80 · prueba", "taller", "mecanica", 4.6800, -74.0900, "Calle 80 # 69-10", None, None, None, "L-S 8am-6pm", []),
    ("Taller Mecánico Chapinero · prueba", "taller", "mecanica", 4.6460, -74.0610, "Carrera 13 # 58-20", None, None, None, "L-V 8am-5pm", []),
    ("Montallantas Av. 68 · prueba", "montallantas", "llantas", 4.6700, -74.1070, "Av. 68 # 72-30", None, None, None, "24 horas", []),
    ("Electro Auto Kennedy · prueba", "taller", "electricidad", 4.6350, -74.1450, "Av. 1 de Mayo # 78-12", None, None, None, "L-S 8am-5pm", []),
]

# (condicion, pasos, que_no_hacer, especialidad)
GUIAS = [
    ("ACV / derrame cerebral", ["Llama al 123 de inmediato: cada minuto cuenta.", "Anota la hora en que empezaron los síntomas.", "Mantén a la persona acostada con la cabeza un poco elevada.", "Afloja la ropa ajustada."], ["No le des comida, bebida ni medicamentos.", "No esperes a que los síntomas pasen solos."], "Neurología"),
    ("Dificultad respiratoria / asma", ["Siéntala con la espalda recta y mantén la calma.", "Ayúdala a usar su inhalador si lo tiene formulado.", "Abre ventanas para que circule el aire.", "Si no mejora o se pone morada, llama al 123."], ["No la acuestes.", "No la dejes sola."], "Neumología"),
    ("Quemaduras leves", ["Enfría la zona con agua fresca corriente durante 10 a 20 minutos.", "Retira anillos o ropa que no estén pegados a la piel.", "Cubre con una gasa limpia."], ["No uses hielo.", "No revientes las ampollas.", "No apliques pasta dental, aceite ni remedios caseros."], "Medicina General"),
    ("Fiebre en niños", ["Viste al niño con ropa ligera.", "Ofrécele líquidos en pequeñas cantidades.", "Consulta pronto si es menor de 3 meses, si la fiebre pasa de 39 o dura más de 48 horas."], ["No lo abrigues en exceso.", "No le des aspirina.", "No le des medicamentos sin indicación médica."], "Pediatría"),
    ("Convulsiones", ["Aleja los objetos con los que pueda golpearse.", "Pon algo blando bajo su cabeza.", "Cuando termine, gíralo de lado.", "Mide el tiempo: si pasa de 5 minutos, llama al 123."], ["No lo sujetes.", "No pongas nada en su boca."], "Neurología"),
    ("Atragantamiento", ["Si puede toser, anímala a seguir tosiendo.", "Si no puede respirar ni hablar, llama al 123.", "Da 5 golpes firmes en la espalda, entre los omóplatos, e inclínala hacia adelante."], ["No le des golpes si puede toser.", "No le des agua."], "Medicina General"),
    ("Esguince o golpe", ["Reposo: evita apoyar la zona.", "Aplica frío 15 a 20 minutos con un paño de por medio.", "Eleva la zona y venda sin apretar."], ["No apliques calor las primeras 48 horas.", "No masajees la zona.", "No sigas con la actividad."], "Ortopedia"),
    ("Intoxicación", ["Llama al 123.", "Aleja a la persona de la sustancia.", "Guarda el envase o la etiqueta para mostrarla al personal de salud."], ["No provoques el vómito.", "No le des leche ni remedios caseros."], "Toxicología"),
]

# (nombre, categoria, descripcion, lat, lon, horario, costo)
PUNTOS = [
    ("Museo Botero", "museo", "Obras de Fernando Botero y colección de arte internacional.", 4.5972, -74.0733, "L, M-S 9am-7pm · D 10am-5pm", 0),
    ("Museo Nacional de Colombia", "museo", "El museo más antiguo del país, con arqueología, arte e historia.", 4.6156, -74.0689, "M-S 10am-6pm · D 10am-5pm", 6000),
    ("Maloka", "museo", "Museo interactivo de ciencia y tecnología.", 4.6330, -74.1030, "M-V 9am-5pm · S-D 10am-6pm", 30000),
    ("Parque Simón Bolívar", "parque", "El gran parque metropolitano de la ciudad, con lagos y ciclorrutas.", 4.6585, -74.0940, "L-D 5am-8pm", 0),
    ("Jardín Botánico José Celestino Mutis", "parque", "Colecciones de flora andina, páramo y bosque húmedo.", 4.6670, -74.0995, "L-D 8am-5pm", 8000),
    ("Quinta de Bolívar", "museo", "Casa campestre que habitó Simón Bolívar.", 4.6020, -74.0640, "M-D 9am-5pm", 5000),
    ("Plaza de Usaquén", "plaza", "Plaza colonial con mercado de pulgas los domingos.", 4.6940, -74.0310, "24 horas", 0),
    ("Biblioteca Luis Ángel Arango", "monumento", "Biblioteca y centro cultural en La Candelaria.", 4.5970, -74.0725, "L-S 8am-8pm", 0),
]

# ----------------------------------------------------------------- casos
# vial: (descripcion, direccion, lat, lon, problema, severidad, riesgo, entidad, duplicados)
VIALES = [
    ("Hay un hueco enorme en la Av. 68 con Calle 26 y los carros lo esquivan", "Av. 68 con Calle 26, Puente Aranda", 4.6330, -74.1060, "hueco", "alta", "Riesgo de accidente y daño a los vehículos", "Instituto de Desarrollo Urbano (IDU)", 2),
    ("El semáforo de la Carrera 7 con Calle 53 está apagado", "Carrera 7 con Calle 53, Chapinero", 4.6420, -74.0640, "semáforo dañado", "media", "Cruce sin control: riesgo de choques", "Secretaría de Movilidad", 0),
    ("Una alcantarilla sin tapa en plena calle, ya casi no se ve", "Calle 63 # 24-10, Barrios Unidos", 4.6560, -74.0750, "alcantarilla sin tapa", "alta", "Riesgo de caída de peatones y motos", "Empresa de Acueducto de Bogotá", 1),
    ("Un árbol caído tapa un carril de la Calle 100", "Calle 100 # 15-30, Usaquén", 4.6810, -74.0440, "obstáculo en la vía", "media", "Reducción de la movilidad y riesgo de choque", "Jardín Botánico / Secretaría de Ambiente", 0),
]

# taller: (descripcion, dir, lat, lon, vehiculo, falla, testigos, urgencia, conduce, pasos, no_hacer, taller_idx)
TALLERES = [
    ("Mi carro echa humo blanco por el capó y huele a quemado", "Av. Boyacá con Calle 80, Engativá", 4.7040, -74.0970, "carro", "Sobrecalentamiento del motor", ["Temperatura del motor"], "alta", False,
     ["Aléjate del vehículo y llama al 123 si hay humo o fuego.", "Apaga el motor y espera a que se enfríe.", "Llama a una grúa."], ["No abras el capó caliente.", "No sigas conduciendo."], "Taller y Lubricentro Calle 80 · prueba"),
    ("Se me pinchó la llanta trasera de la moto en plena avenida", "Av. 68 # 72-00, Engativá", 4.6690, -74.1060, "moto", "Llanta pinchada o desinflada", [], "media", False,
     ["Estaciona en un lugar seguro y enciende las luces.", "No continúes rodando con la llanta vacía.", "Pide asistencia o llévala a un montallantas."], ["No sigas rodando sobre el rin.", "No arregles en medio del tráfico."], "Montallantas Av. 68 · prueba"),
    ("El carro no enciende, solo hace clic y se apagan las luces del tablero", "Carrera 13 # 58-20, Chapinero", 4.6460, -74.0610, "carro", "Batería descargada", ["Batería"], "media", True,
     ["Revisa que los bornes estén firmes.", "Intenta pasar corriente con otro vehículo y cables adecuados.", "Si no enciende, solicita asistencia."], ["No fuerces el arranque muchas veces seguidas.", "No toques los bornes con joyas metálicas."], "Taller Mecánico Chapinero · prueba"),
]

# comida: (descripcion, dir, lat, lon, antojo, cocina, presupuesto, nombres)
COMIDAS = [
    ("Antojo de hamburguesa cerca de la Zona T, máximo 40 mil", "Zona T, Chapinero", 4.6670, -74.0535, "hamburguesa", "hamburguesas", 40000, ["Home Burger Zona T", "El Corral"]),
    ("Quiero un almuerzo típico colombiano en el centro", "Calle 12 # 7-20, La Candelaria", 4.5990, -74.0750, "comida típica", "colombiana", 30000, ["La Puerta Falsa", "El Corral"]),
    ("Busco una cena especial, no me importa el precio", "Calle 79 # 7-10, Chapinero", 4.6600, -74.0560, "cena especial", "internacional", None, ["Harry Sasson", "Leo Cocina y Cava"]),
]

# explora: (descripcion, dir, lat, lon, lugar, contexto, tiempo_min, intereses, nombres_puntos)
EXPLORAS = [
    ("Tengo 4 horas libres y me gustan los museos, estoy en La Candelaria", "Plaza de Bolívar, La Candelaria", 4.5981, -74.0760, "La Candelaria", "Centro histórico con la mayor concentración de museos de la ciudad.", 240, ["museos", "historia"], ["Museo Botero", "Biblioteca Luis Ángel Arango", "Museo del Oro"]),
    ("Quiero un plan de naturaleza para la mañana del domingo", "Parque Simón Bolívar, Teusaquillo", 4.6585, -74.0940, "Parque Simón Bolívar", "Los parques y jardines del occidente de la ciudad.", 180, ["naturaleza", "parques"], ["Parque Simón Bolívar", "Jardín Botánico José Celestino Mutis"]),
    ("Plan tranquilo en Usaquén, una tarde", "Plaza de Usaquén, Usaquén", 4.6940, -74.0310, "Usaquén", "Antiguo pueblo colonial hoy dentro de la ciudad.", 150, ["plazas", "mercado"], ["Plaza de Usaquén"]),
]

# chat: índice de caso (por clave) -> lista de (pregunta, respuesta)
CHATS = {
    "vial0": [("¿Qué entidad debo contactar?", "Según el resultado del caso, la entidad sugerida es el Instituto de Desarrollo Urbano (IDU). Ya quedó creado un reporte vial con su identificador."),
              ("¿Cuándo lo van a arreglar?", "No tengo ese dato verificado. El sistema solo registra el reporte; el tiempo de reparación lo define la entidad.")],
    "taller0": [("¿Puedo seguir conduciendo?", "No. El caso indica que no debes conducir el vehículo: aléjate y, si hay humo o fuego, llama al 123."),
                ("¿Cuánto cuesta la reparación?", "No tengo ese dato verificado. Puedes consultarlo directamente con el taller.")],
    "comida0": [("¿Cuál me queda más cerca?", "Según nuestros datos, la opción más cercana en línea recta es la primera de la lista. Es una distancia estimada, no una ruta.")],
    "explora0": [("¿Cuánto dura todo el recorrido?", "Según el recorrido guardado, el tiempo estimado es el que ves en el resumen; las distancias son en línea recta y no incluyen el tiempo de espera.")],
    "salud_info": [("¿Qué información falta?", "Falta describir los síntomas: qué sientes, desde cuándo y qué tan intenso es. Con eso puedo orientarte.")],
}


def base_resultado(caso_id, intencion, resumen, ubic, aprobado=True, extra_adv=None, calidad=None, prioridad="normal"):
    return {
        "caso_id": caso_id, "intencion": intencion, "confianza": 0.9, "resumen": resumen, "observacion_imagen": None,
        "ubicacion": ubic, "calidad_informacion": calidad or {"suficiente": True, "contradicciones": [], "datos_faltantes": [], "fuera_de_contexto": False},
        "salud": None, "sabor": None, "taller": None, "vial": None, "explora": None, "acciones": [],
        "verificacion": {"aprobado": aprobado, "advertencias": [NOTA] + (extra_adv or []), "lugares_descartados": [], "fuentes": []},
        "prioridad": prioridad,
    }


def ubicacion(texto, lat, lon):
    return {"texto": texto, "lat": lat, "lon": lon, "barrio": texto.split(",")[-1].strip(), "fuente": "gps"}


def trazas(caso_id, agente_dominio, herramientas, accion=None, intencion="vial", solo_triage=False):
    """Pasos de ejemplo en el orden real del pipeline. Todas llevan _prueba: true."""
    pasos = [
        ("TriageAgent", None, {"texto": "…"}, {"intencion": intencion}, 2100),
        ("GeoAgent", "identificar_direccion", {"lat": "…", "lon": "…"}, {"direccion": "…"}, 900),
        ("GeoAgent", "consultar_reportes_cercanos", {"radio_m": 500}, {"cercanos": "…"}, 12),
        ("GeoAgent", None, {}, "ubicación resuelta", 930),
        ("Orquestador (LangGraph)", None, {"intencion": intencion}, {"siguiente_nodo": "verificador" if solo_triage else agente_dominio.lower().replace("agent", ""), "motivo": f"intención '{intencion}'"}, 0),
    ]
    if not solo_triage:
        for h, i, o, ms in herramientas:
            pasos.append((agente_dominio, h, i, o, ms))
        if accion:
            pasos.append((agente_dominio, accion, {"caso_id": caso_id}, {"estado": "creado"}, 18))
        pasos.append((agente_dominio, None, {}, "resultado del agente", 2600))
    pasos.append(("VerificadorAgent", None, {}, {"aprobado": not solo_triage}, 2))
    filas = []
    for n, (ag, h, i, o, ms) in enumerate(pasos, 1):
        i = dict(i) if isinstance(i, dict) else {"entrada": i}
        o = dict(o) if isinstance(o, dict) else {"salida": o}
        i["_prueba"] = True
        o["_prueba"] = True
        filas.append(Traza(caso_id=caso_id, orden=n, agente=ag, herramienta=h, input_json=j(i), output_json=j(o), duracion_ms=ms, estado="completed"))
    return filas


async def main():
    async with AsyncSessionLocal() as s:
        nuevos = {k: 0 for k in ["especialidades", "lugares", "lugar_especialidad", "guias_estabilizacion", "puntos_interes", "casos", "reportes_viales", "solicitudes_asistencia", "recomendaciones", "recorridos", "paradas_recorrido", "mensajes_chat", "trazas"]}

        # ---- catálogos
        esp = {e.nombre: e.id for e in (await s.execute(select(Especialidad))).scalars()}
        for n in ESPECIALIDADES:
            if n not in esp:
                e = Especialidad(nombre=n); s.add(e); await s.flush(); esp[n] = e.id; nuevos["especialidades"] += 1

        lug = {l.nombre: l for l in (await s.execute(select(Lugar))).scalars()}
        for n, cat, sub, lat, lon, dire, precio, rango, rating, hor, especs in LUGARES:
            if n in lug:
                continue
            l = Lugar(nombre=n, categoria=cat, subcategoria=sub, lat=lat, lon=lon, direccion=dire, telefono=None,
                      precio_promedio=precio, rango_precio=rango, rating=rating, horario=hor)
            s.add(l); await s.flush(); lug[n] = l; nuevos["lugares"] += 1
            for en in especs:
                s.add(LugarEspecialidad(lugar_id=l.id, especialidad_id=esp[en])); nuevos["lugar_especialidad"] += 1

        guias = {g.condicion for g in (await s.execute(select(GuiaEstabilizacion))).scalars()}
        for cond, pasos, no, en in GUIAS:
            if cond not in guias:
                s.add(GuiaEstabilizacion(condicion=cond, pasos=j(pasos), que_no_hacer=j(no), especialidad_id=esp[en])); nuevos["guias_estabilizacion"] += 1

        pts = {p.nombre: p for p in (await s.execute(select(PuntoInteres))).scalars()}
        for n, cat, desc, lat, lon, hor, costo in PUNTOS:
            if n not in pts:
                p = PuntoInteres(nombre=n, categoria=cat, descripcion=desc, lat=lat, lon=lon, horario=hor, costo_entrada=costo)
                s.add(p); await s.flush(); pts[n] = p; nuevos["puntos_interes"] += 1
        # los puntos que ya existían de la semilla original
        for p in (await s.execute(select(PuntoInteres))).scalars():
            pts[p.nombre] = p

        # ---- casos
        k = 0

        async def nuevo_caso(clave, tipo, estado, desc, dire, lat, lon, prioridad, resultado_fn):
            nonlocal k
            k += 1
            cid = str(uuid.uuid5(NS, clave))
            if await s.get(Caso, cid):
                return None
            c = Caso(id=cid, tipo=tipo, estado=estado, descripcion=desc, lat=lat, lon=lon, direccion=dire, prioridad=prioridad,
                     creado_en=AHORA - timedelta(hours=2 + 5 * k))
            c.resultado_json = j(resultado_fn(cid))
            s.add(c); await s.flush(); nuevos["casos"] += 1
            return c

        def chat(c, clave):
            for q, r in CHATS.get(clave, []):
                s.add(MensajeChat(caso_id=c.id, rol="usuario", contenido=q))
                s.add(MensajeChat(caso_id=c.id, rol="asistente", contenido=r)); nuevos["mensajes_chat"] += 2

        # vial
        for i, (desc, dire, lat, lon, prob, sev, riesgo, ent, dup) in enumerate(VIALES):
            def res(cid, prob=prob, sev=sev, riesgo=riesgo, ent=ent, dup=dup, desc=desc, dire=dire, lat=lat, lon=lon):
                r = base_resultado(cid, "vial", f"Reporte de {prob} en la vía.", ubicacion(dire, lat, lon), prioridad=sev)
                r["vial"] = {"tipo_problema": prob, "severidad": sev, "riesgo": riesgo, "entidad_sugerida": ent, "duplicados_cercanos": dup, "reporte_id": None}
                return r
            c = await nuevo_caso(f"vial{i}", "vial", "completado", desc, dire, lat, lon, sev, res)
            if c:
                rep = ReporteVial(id=str(uuid.uuid5(NS, f"rep{i}")), caso_id=c.id, tipo_problema=prob, severidad=sev, lat=lat, lon=lon, direccion=dire, barrio=dire.split(",")[-1].strip(), estado=["abierto", "abierto", "asignado", "resuelto"][i])
                s.add(rep); await s.flush(); nuevos["reportes_viales"] += 1
                r = json.loads(c.resultado_json); r["vial"]["reporte_id"] = rep.id; r["acciones"] = [{"tipo": "reporte_vial_creado", "id": rep.id}]; c.resultado_json = j(r)
                for t in trazas(c.id, "VialAgent", [("consultar_reportes_cercanos", {"radio_m": 150}, {"cercanos": dup}, 9)], "crear_reporte_vial", "vial"):
                    s.add(t); nuevos["trazas"] += 1
                chat(c, f"vial{i}")

        # vial con información contradictoria (requiere_info)
        def res_contra(cid):
            cal = {"suficiente": True, "contradicciones": ["El texto habla de un hueco en la calle, pero la imagen muestra un plato de comida."], "datos_faltantes": [], "fuera_de_contexto": False}
            r = base_resultado(cid, "vial", "Reporte de un hueco, pero la imagen no corresponde.", ubicacion("Calle 45 # 13-20, Chapinero", 4.6380, -74.0660), aprobado=False, calidad=cal,
                               extra_adv=["Contradicción detectada: El texto habla de un hueco en la calle, pero la imagen muestra un plato de comida."])
            return r
        c = await nuevo_caso("contra", "vial", "requiere_info", "Hay un hueco enorme en la calle", "Calle 45 # 13-20, Chapinero", 4.6380, -74.0660, "normal", res_contra)
        if c:
            for t in trazas(c.id, "VialAgent", [], None, "vial", solo_triage=True):
                s.add(t); nuevos["trazas"] += 1

        # taller
        for i, (desc, dire, lat, lon, veh, falla, test, urg, cond, pasos, no, tn) in enumerate(TALLERES):
            tl = lug[tn]
            def res(cid, veh=veh, falla=falla, test=test, urg=urg, cond=cond, pasos=pasos, no=no, tl=tl, desc=desc, dire=dire, lat=lat, lon=lon):
                prio = "critica" if (not cond and urg == "alta") else urg
                r = base_resultado(cid, "taller", f"Falla del vehículo: {falla.lower()}.", ubicacion(dire, lat, lon), prioridad=prio)
                r["taller"] = {"tipo_vehiculo": veh, "falla_probable": falla, "testigos_detectados": test, "urgencia": urg, "puede_conducir": cond, "pasos_seguridad": pasos, "que_no_hacer": no,
                               "talleres": [{"nombre": tl.nombre, "distancia_m": dist(lat, lon, tl.lat, tl.lon), "duracion_s": 0, "lat": tl.lat, "lon": tl.lon, "ruta_verificada": False, "servicios": [tl.subcategoria or "mecanica"], "telefono": None}],
                               "solicitud_id": None}
                return r
            prio = "critica" if (not cond and urg == "alta") else urg
            c = await nuevo_caso(f"taller{i}", "taller", "completado", desc, dire, lat, lon, prio, res)
            if c:
                sol = SolicitudAsistencia(id=str(uuid.uuid5(NS, f"sol{i}")), caso_id=c.id, tipo_vehiculo=veh, falla_probable=falla, urgencia=urg, puede_conducir=cond, lugar_id=tl.id, estado=["abierta", "asignada", "atendida"][i])
                s.add(sol); await s.flush(); nuevos["solicitudes_asistencia"] += 1
                r = json.loads(c.resultado_json); r["taller"]["solicitud_id"] = sol.id; r["acciones"] = [{"tipo": "solicitud_asistencia_creada", "id": sol.id}]; c.resultado_json = j(r)
                for t in trazas(c.id, "TallerAgent", [("evaluar_riesgo_vehicular", {"falla": falla}, {"hay_riesgo": not cond}, 1), ("buscar_lugares_externos", {"categoria": "taller"}, {"candidatos": 3}, 640)], "crear_solicitud_asistencia", "taller"):
                    s.add(t); nuevos["trazas"] += 1
                chat(c, f"taller{i}")

        # comida
        for i, (desc, dire, lat, lon, antojo, cocina, pres, nombres) in enumerate(COMIDAS):
            lista = [lug[n] for n in nombres]
            def res(cid, lista=lista, antojo=antojo, cocina=cocina, pres=pres, lat=lat, lon=lon, dire=dire):
                r = base_resultado(cid, "comida", f"Recomendaciones de {antojo}.", ubicacion(dire, lat, lon), prioridad="baja")
                r["sabor"] = {"antojo": antojo, "tipo_cocina": cocina, "presupuesto_max": pres, "restricciones": [],
                              "lugares": [{"nombre": l.nombre, "distancia_m": dist(lat, lon, l.lat, l.lon), "duracion_s": 0, "lat": l.lat, "lon": l.lon, "ruta_verificada": False,
                                           "precio_promedio": l.precio_promedio, "precio_verificado": True, "rating": l.rating, "motivo": f"Cocina {l.subcategoria}, calificación {l.rating}.", "fuente": "propia"} for l in lista]}
                return r
            c = await nuevo_caso(f"comida{i}", "comida", "completado", desc, dire, lat, lon, "baja", res)
            if c:
                for n, l in enumerate(lista):
                    s.add(Recomendacion(caso_id=c.id, lugar_id=l.id, fuente="propia", distancia_m=dist(lat, lon, l.lat, l.lon), duracion_s=0, puntaje=round(0.9 - 0.1 * n, 2),
                                        motivo=f"Cocina {l.subcategoria}", seleccionada=(n == 0))); nuevos["recomendaciones"] += 1
                await s.flush()
                rec = (await s.execute(select(Recomendacion).where(Recomendacion.caso_id == c.id, Recomendacion.seleccionada == True))).scalar_one()  # noqa: E712
                r = json.loads(c.resultado_json); r["acciones"] = [{"tipo": "recomendacion_guardada", "id": rec.id, "lugar": lista[0].nombre}]; c.resultado_json = j(r)
                for t in trazas(c.id, "SaborAgent", [("buscar_lugares_por_texto", {"texto": antojo, "radio_km": 2}, {"candidatos": len(lista)}, 410), ("consultar_lugares_propios", {"categoria": "restaurante"}, {"candidatos": len(lista)}, 6)], "guardar_recomendacion", "comida"):
                    s.add(t); nuevos["trazas"] += 1
                chat(c, f"comida{i}")

        # explora
        for i, (desc, dire, lat, lon, lugar, ctx, tmin, inter, nombres) in enumerate(EXPLORAS):
            paradas = [pts[n] for n in nombres]
            tramos = [dist(lat, lon, paradas[0].lat, paradas[0].lon)] + [dist(a.lat, a.lon, b.lat, b.lon) for a, b in zip(paradas, paradas[1:])]
            total = sum(tramos)
            dur = int(total / 1.3) + 45 * 60 * len(paradas)
            def res(cid, paradas=paradas, tramos=tramos, total=total, dur=dur, lugar=lugar, ctx=ctx, tmin=tmin, inter=inter, lat=lat, lon=lon, dire=dire):
                r = base_resultado(cid, "explora", f"Recorrido por {lugar}.", ubicacion(dire, lat, lon), prioridad="baja")
                r["explora"] = {"lugar_identificado": lugar, "nombre_propio": None, "confianza": 0.9, "requiere_confirmacion": False, "contexto": ctx, "fuente_contexto": "datos propios",
                                "tiempo_disponible_min": tmin, "intereses": inter, "distancia_total_m": total, "duracion_total_s": dur, "recorrido_id": None,
                                "paradas": [{"nombre": p.nombre, "orden": n + 1, "minutos_sugeridos": 45, "descripcion": p.descripcion, "modo": "walk", "fuente": "propia",
                                             "distancia_m": tramos[n], "duracion_s": 0, "lat": p.lat, "lon": p.lon, "ruta_verificada": False} for n, p in enumerate(paradas)]}
                return r
            c = await nuevo_caso(f"explora{i}", "explora", "completado", desc, dire, lat, lon, "baja", res)
            if c:
                rec = Recorrido(id=str(uuid.uuid5(NS, f"rec{i}")), caso_id=c.id, titulo=f"Recorrido por {lugar}", distancia_total_m=total, duracion_total_s=dur, modo="walk")
                s.add(rec); await s.flush(); nuevos["recorridos"] += 1
                for n, p in enumerate(paradas):
                    s.add(ParadaRecorrido(recorrido_id=rec.id, orden=n + 1, poi_id=p.id, nombre=p.nombre, lat=p.lat, lon=p.lon, minutos_sugeridos=45)); nuevos["paradas_recorrido"] += 1
                r = json.loads(c.resultado_json); r["explora"]["recorrido_id"] = rec.id; r["acciones"] = [{"tipo": "recorrido_guardado", "id": rec.id}]; c.resultado_json = j(r)
                for t in trazas(c.id, "ExploraAgent", [("consultar_puntos_interes", {"radio_m": 5000}, {"candidatos": len(paradas)}, 8)], "guardar_recorrido", "explora"):
                    s.add(t); nuevos["trazas"] += 1
                chat(c, f"explora{i}")

        # salud con información insuficiente
        def res_info(cid):
            cal = {"suficiente": False, "contradicciones": [], "datos_faltantes": ["Describe los síntomas: qué sientes, desde cuándo y qué tan intenso es."], "fuera_de_contexto": False}
            return base_resultado(cid, "salud", "El usuario dice sentirse mal, sin dar síntomas.", ubicacion("Carrera 15 # 85-20, Chapinero", 4.6700, -74.0545), aprobado=False, calidad=cal,
                                  extra_adv=["Información insuficiente. Por favor agrega: Describe los síntomas: qué sientes, desde cuándo y qué tan intenso es."])
        c = await nuevo_caso("salud_info", "salud", "requiere_info", "Me siento mal", "Carrera 15 # 85-20, Chapinero", 4.6700, -74.0545, "normal", res_info)
        if c:
            for t in trazas(c.id, "SaludAgent", [], None, "salud", solo_triage=True):
                s.add(t); nuevos["trazas"] += 1
            chat(c, "salud_info")

        # caso con error del modelo
        c = await nuevo_caso("error", "vial", "error", "Hay un hueco grande en la Carrera 30", "Carrera 30 # 45-10, Teusaquillo", 4.6360, -74.0840, "normal",
                             lambda cid: {"error": "Tiempo de espera agotado al consultar el modelo (dato de prueba)"})
        if c:
            s.add(Traza(caso_id=c.id, orden=1, agente="TriageAgent", herramienta=None, input_json=j({"_prueba": True}), output_json="Tiempo de espera agotado al consultar el modelo (dato de prueba)", duracion_ms=30000, estado="error")); nuevos["trazas"] += 1

        await s.commit()
        print("Filas nuevas por tabla:")
        for t, n in nuevos.items():
            print(f"  {t}: +{n}")

    # Consolida el WAL en orbis.db para que cualquier visor de SQLite vea los datos
    con = sqlite3.connect("orbis.db")
    resultado = con.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
    print("wal_checkpoint (ocupado, páginas del log, páginas pasadas al archivo):", resultado)
    print("Totales:")
    for (t,) in con.execute("select name from sqlite_master where type='table' order by name").fetchall():
        n = con.execute('select count(*) from "%s"' % t).fetchone()[0]
        print(f"  {t}: {n}")
    con.close()


if __name__ == "__main__":
    asyncio.run(main())
