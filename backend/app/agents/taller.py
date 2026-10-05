from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoTaller
from app.agents.comun import REGLA_GROUNDING, origen, filtrar_y_ubicar, completar_rutas, texto_alertas
import app.tools.local  # noqa: F401
import app.tools.actions  # noqa: F401
import app.tools.geo  # noqa: F401
import json
import structlog

log = structlog.get_logger()


class TallerAgent(BaseAgent):
    """Orienta sobre fallas del vehículo y abre una solicitud de asistencia."""

    def __init__(self):
        super().__init__("TallerAgent")

    async def _process(self, state: OrchestratorState):
        texto = state.context.get("texto_usuario", "")
        lat, lon = origen(state)

        # 1. Reglas deterministas de riesgo
        eval_riesgo = await state.usar_herramienta(self.name, "evaluar_riesgo_vehicular", falla=texto)

        # 2. Datos propios: talleres y montallantas
        talleres = await state.usar_herramienta(self.name, "consultar_lugares_propios", categoria="taller", lat=lat, lon=lon, radio_m=15000)
        montallantas = await state.usar_herramienta(self.name, "consultar_lugares_propios", categoria="montallantas", lat=lat, lon=lon, radio_m=15000)
        lugares = sorted(talleres + montallantas, key=lambda x: x["distancia_m"])[:5]
        for l in lugares:
            l["fuente"] = "propia"

        if len(lugares) < 3:
            try:
                lugares += (await state.usar_herramienta(self.name, "buscar_lugares_externos", categoria="taller", lat=lat, lon=lon, radio_m=5000))[:5]
            except Exception:
                pass

        system_instruction = """
        Eres el agente de Taller de ORBIS. Orientas sobre problemas mecánicos de vehículos.
        Determina la falla probable, la urgencia (alta, media, baja), si el vehículo se puede seguir
        conduciendo, los pasos de seguridad y los talleres o montallantas sugeridos de la lista.
        Si hay riesgo inminente (humo, fuego, falla de frenos), la urgencia es 'alta', puede_conducir es false
        y DEBES indicar que llamen al 123 y se alejen del vehículo.
        Si hay foto de testigos del tablero, identifícalos en testigos_detectados.
        """ + REGLA_GROUNDING

        prompt = f"""
        Falla o situación reportada: '{texto}'
        Riesgos detectados por reglas: {eval_riesgo["riesgos"] or "ninguno"}
        {texto_alertas(state)}

        Talleres cercanos disponibles:
        {json.dumps(lugares, indent=2, ensure_ascii=False)}
        """

        resultado: ResultadoTaller = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoTaller,
            system_instruction=system_instruction,
            imagen_path=state.context.get("imagen_path")
        )

        # Las reglas mandan sobre el modelo
        if eval_riesgo["hay_riesgo"]:
            resultado.urgencia = "alta"
            resultado.puede_conducir = False

        sugeridos = [t.nombre for t in resultado.talleres]
        resultado.talleres = filtrar_y_ubicar(resultado.talleres, lugares)
        state.context.setdefault("descartados", []).extend(n for n in sugeridos if n not in [t.nombre for t in resultado.talleres])
        await completar_rutas(state, self.name, resultado.talleres)

        # Acción: crear solicitud de asistencia
        accion = await state.usar_herramienta(
            self.name, "crear_solicitud_asistencia",
            caso_id=state.caso_id, tipo_vehiculo=resultado.tipo_vehiculo, falla_probable=resultado.falla_probable,
            urgencia=resultado.urgencia, puede_conducir=resultado.puede_conducir
        )
        resultado.solicitud_id = accion["solicitud_id"]
        state.registrar_accion("solicitud_asistencia_creada", {"id": accion["solicitud_id"], "estado": accion["estado"]})

        state.context["taller"] = resultado
        log.info("Agente Taller completado", falla=resultado.falla_probable)
        return resultado
