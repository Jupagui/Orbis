from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoSabor
from app.agents.comun import REGLA_GROUNDING, origen, filtrar_y_ubicar, completar_rutas, texto_alertas
import app.tools.local  # noqa: F401
import app.tools.actions  # noqa: F401
import app.tools.geo  # noqa: F401
import json
import structlog

log = structlog.get_logger()

RADIO_A_PIE_M = 2000


class SaborAgent(BaseAgent):
    """Recomienda lugares de comida combinando datos propios y lugares reales del mapa."""

    def __init__(self):
        super().__init__("SaborAgent")

    async def _process(self, state: OrchestratorState):
        texto = state.context.get("texto_usuario", "")
        lat, lon = origen(state)

        # 1. Datos propios (tienen precio y rating verificados). Mismo radio que los externos:
        #    las recomendaciones de comida son para ir caminando.
        propios = await state.usar_herramienta(self.name, "consultar_lugares_propios", categoria="restaurante", lat=lat, lon=lon, radio_m=RADIO_A_PIE_M)
        for r in propios:
            r["fuente"] = "propia"

        # 2. Lugares reales del servicio de mapas
        try:
            externos = await state.usar_herramienta(self.name, "buscar_lugares_externos", categoria="restaurante", lat=lat, lon=lon, radio_m=RADIO_A_PIE_M)
        except Exception as e:
            log.error("No se pudieron consultar lugares externos", error=str(e))
            externos = []

        # Combinar y eliminar duplicados por nombre (los propios primero)
        vistos, restaurantes = set(), []
        for r in propios + externos:
            nombre = r["nombre"].lower().strip()
            if nombre not in vistos:
                vistos.add(nombre)
                restaurantes.append(r)
        restaurantes = restaurantes[:25]

        system_instruction = """
        Eres el agente Sabor de ORBIS. Encuentras lugares de comida cercanos según el antojo,
        tipo de cocina y presupuesto del usuario. Elige y ordena los restaurantes de la lista
        con un motivo corto de por qué fue elegido.
        precio_verificado=true SOLO si el lugar trae precio_promedio en la lista; si no, precio_promedio=null.
        """ + REGLA_GROUNDING

        prompt = f"""
        Antojo/Petición: '{texto}'
        {texto_alertas(state)}

        Restaurantes cercanos disponibles:
        {json.dumps(restaurantes, indent=2, ensure_ascii=False)}
        """

        resultado: ResultadoSabor = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoSabor,
            system_instruction=system_instruction,
            imagen_path=state.context.get("imagen_path")
        )

        sugeridos = [l.nombre for l in resultado.lugares]
        resultado.lugares = filtrar_y_ubicar(resultado.lugares, restaurantes)
        state.context.setdefault("descartados", []).extend(n for n in sugeridos if n not in [l.nombre for l in resultado.lugares])
        await completar_rutas(state, self.name, resultado.lugares, modo="walk")

        # Acción: guardar la recomendación principal
        if resultado.lugares:
            elegido = resultado.lugares[0]
            lugar = next((r for r in restaurantes if r["nombre"] == elegido.nombre), {})
            accion = await state.usar_herramienta(
                self.name, "guardar_recomendacion",
                caso_id=state.caso_id, lugar_id=lugar.get("id") if lugar.get("fuente") == "propia" else None,
                distancia_m=elegido.distancia_m, duracion_s=elegido.duracion_s, motivo=elegido.motivo,
                fuente=elegido.fuente
            )
            state.registrar_accion("recomendacion_guardada", {"id": accion["recomendacion_id"], "lugar": elegido.nombre})

        state.context["sabor"] = resultado
        log.info("Agente Sabor completado", tipo_cocina=resultado.tipo_cocina)
        return resultado
