from app.orchestrator.state import BaseAgent, OrchestratorState
from app.schemas.domain import RespuestaFinal, Verificacion
import structlog

log = structlog.get_logger()

DOMINIOS = {"vial": "vial", "salud": "salud", "comida": "sabor", "taller": "taller", "explora": "explora"}

# Escala común para ordenar la atención de los casos (menor número = se atiende primero)
ORDEN_PRIORIDAD = {"critica": 0, "alta": 1, "media": 2, "baja": 3, "normal": 4}
EQUIVALENCIAS = {"emergencia": "critica", "crítica": "critica", "critica": "critica", "alta": "alta",
                 "media": "media", "moderada": "media", "baja": "baja", "leve": "baja"}


def calcular_prioridad(clave: str | None, dominio) -> str:
    """Prioridad del caso según la urgencia o severidad que produjo el agente de dominio.
    Es determinista: la misma entrada siempre da la misma prioridad."""
    if dominio is None:
        return "normal"
    if clave == "salud":
        nivel = dominio.nivel_urgencia
    elif clave == "taller":
        nivel = "critica" if not dominio.puede_conducir and dominio.urgencia == "alta" else dominio.urgencia
    elif clave == "vial":
        nivel = dominio.severidad
    else:
        return "baja"  # Sabor y Explora no son urgentes
    return EQUIVALENCIAS.get((nivel or "").strip().lower(), "media")


class VerificadorAgent(BaseAgent):
    """Control de calidad determinista: no usa el LLM. Revisa lo que produjeron los demás agentes
    antes de entregarlo al usuario y ensambla la respuesta final."""

    def __init__(self):
        super().__init__("VerificadorAgent")

    async def _process(self, state: OrchestratorState):
        triage = state.context.get("triage")
        ubicacion = state.context.get("ubicacion")
        intencion = triage.intencion if triage else "indefinido"
        advertencias: list[str] = []

        # 1. Calidad de la información recibida
        calidad = triage.calidad_informacion if triage else None
        if calidad:
            if not calidad.suficiente:
                faltan = ", ".join(calidad.datos_faltantes) or "más detalles"
                advertencias.append(f"Información insuficiente. Por favor agrega: {faltan}.")
            for c in calidad.contradicciones:
                advertencias.append(f"Contradicción detectada: {c}")
            if calidad.fuera_de_contexto:
                advertencias.append("La solicitud no corresponde a movilidad o servicios urbanos.")
        if triage and triage.confianza < 0.5:
            advertencias.append(f"Clasificación con baja confianza ({triage.confianza:.0%}); verifica que el módulo sea el correcto.")

        # 2. Ubicación
        if ubicacion and ubicacion.fuente == "referencia":
            advertencias.append("No se confirmó tu ubicación: las distancias se calcularon desde el centro de Bogotá.")
        elif state.context.get("ubicacion_aproximada"):
            advertencias.append(f"La dirección se ubicó de forma aproximada ({ubicacion.texto}). Verifica que sea correcta.")

        # 3. Resultado del agente de dominio
        clave = DOMINIOS.get(intencion)
        dominio = state.context.get(clave) if clave else None
        if clave and calidad and calidad.suficiente and not calidad.fuera_de_contexto and dominio is None:
            advertencias.append("El agente especializado no produjo resultado.")

        lugares = []
        if dominio is not None:
            lugares = getattr(dominio, "centros", None) or getattr(dominio, "lugares", None) \
                or getattr(dominio, "talleres", None) or getattr(dominio, "paradas", None) or []
            if any(not l.ruta_verificada for l in lugares):
                advertencias.append("Algunas distancias no se pudieron confirmar con el servicio de mapas.")
            if clave in ("salud", "sabor", "taller") and not lugares:
                advertencias.append("No se encontraron lugares verificados cerca de tu ubicación.")
            if clave == "explora" and not lugares:
                advertencias.append("No se pudo armar un recorrido: no hay puntos de interés verificados cerca.")
            if state.context.get("lugar_no_ubicado"):
                advertencias.append(f"Se reconoció '{state.context['lugar_no_ubicado']}', pero el servicio de mapas "
                                    "no encontró su dirección. No se muestra una ubicación sin verificar.")

        # 4. Reglas de seguridad
        if intencion == "salud" and dominio and dominio.nivel_urgencia in ("alta", "emergencia"):
            if not any("123" in r for r in dominio.recomendaciones_estabilizacion):
                dominio.recomendaciones_estabilizacion.insert(0, "Llama a la línea de emergencias 123.")
        if intencion == "taller" and dominio and not dominio.puede_conducir:
            if not any("123" in p for p in dominio.pasos_seguridad):
                dominio.pasos_seguridad.insert(0, "Aléjate del vehículo y llama al 123 si hay humo o fuego.")

        # 5. Herramientas que fallaron: se informa en vez de ocultarlo
        fallidas = sorted({t["herramienta"] for t in state.trazas if t["herramienta"] and t["estado"] == "error"})
        if fallidas:
            advertencias.append(f"No se pudo consultar: {', '.join(fallidas)}. El resultado usa solo la información disponible.")

        descartados = state.context.get("descartados", [])
        if descartados:
            advertencias.append(f"Se descartaron {len(descartados)} lugares que el modelo sugirió sin estar en los datos consultados.")

        fuentes = sorted({t["herramienta"] for t in state.trazas if t["herramienta"] and t["estado"] == "completed"})

        verificacion = Verificacion(
            aprobado=bool(calidad and calidad.suficiente and not calidad.fuera_de_contexto
                          and not calidad.contradicciones and (dominio is None or lugares or clave == "vial")),
            advertencias=advertencias,
            lugares_descartados=descartados,
            fuentes=fuentes,
        )

        respuesta = RespuestaFinal(
            caso_id=state.caso_id,
            intencion=intencion,
            confianza=triage.confianza if triage else 0.0,
            resumen=triage.resumen if triage else "",
            observacion_imagen=triage.observacion_imagen if triage else None,
            ubicacion=ubicacion,
            calidad_informacion=calidad,
            acciones=state.acciones,
            verificacion=verificacion,
            prioridad=calcular_prioridad(clave, dominio),
        )
        if clave and dominio is not None:
            setattr(respuesta, clave, dominio)

        state.context["respuesta_final"] = respuesta
        log.info("Verificador completado", aprobado=verificacion.aprobado, advertencias=len(advertencias))
        return verificacion
