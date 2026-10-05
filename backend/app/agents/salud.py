from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoSalud
from app.agents.comun import REGLA_GROUNDING, origen, filtrar_y_ubicar, completar_rutas, texto_alertas
import app.tools.local  # noqa: F401
import app.tools.actions  # noqa: F401
import app.tools.geo  # noqa: F401
import json
import structlog

log = structlog.get_logger()


class SaludAgent(BaseAgent):
    """Orienta (sin diagnosticar) sobre urgencia, especialidad y centros médicos cercanos."""

    def __init__(self):
        super().__init__("SaludAgent")

    async def _process(self, state: OrchestratorState):
        texto = state.context.get("texto_usuario", "")
        lat, lon = origen(state)

        # 1. Reglas deterministas: no dependen del modelo
        eval_alarma = await state.usar_herramienta(self.name, "evaluar_senales_alarma", sintomas=texto)

        # 2. Datos propios: hospitales y clínicas registrados + guías de estabilización
        hospitales = await state.usar_herramienta(self.name, "consultar_lugares_propios", categoria="hospital", lat=lat, lon=lon, radio_m=10000)
        clinicas = await state.usar_herramienta(self.name, "consultar_lugares_propios", categoria="clinica", lat=lat, lon=lon, radio_m=10000)
        centros = sorted(hospitales + clinicas, key=lambda x: x["distancia_m"])[:5]
        for c in centros:
            c["fuente"] = "propia"

        # 3. Si los datos propios no alcanzan, se complementa con el servicio de mapas
        if len(centros) < 3:
            try:
                externos = await state.usar_herramienta(self.name, "buscar_lugares_externos", categoria="hospital", lat=lat, lon=lon, radio_m=5000)
                centros += externos[:5]
            except Exception:
                pass

        guias = await state.usar_herramienta(self.name, "consultar_guias_estabilizacion")

        system_instruction = """
        Eres el agente de Salud de ORBIS. Orientas al usuario en una situación de salud.
        REGLA CRÍTICA: NO diagnosticas. Clasificas la urgencia (baja, media, alta, emergencia), sugieres
        la especialidad, identificas señales de alarma y das recomendaciones de estabilización basadas
        ESTRICTAMENTE en las guías proporcionadas.
        Si el nivel de urgencia es 'emergencia' o 'alta', DEBES recomendar llamar al 123 y acudir al centro más cercano.
        """ + REGLA_GROUNDING

        prompt = f"""
        Síntomas reportados: '{texto}'
        Señales de alarma detectadas por reglas: {eval_alarma["alarmas"] or "ninguna"}
        {texto_alertas(state)}

        Centros médicos cercanos disponibles (usa solo estos):
        {json.dumps(centros, indent=2, ensure_ascii=False)}

        Guías de estabilización disponibles:
        {json.dumps(guias, indent=2, ensure_ascii=False)}
        """

        resultado: ResultadoSalud = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoSalud,
            system_instruction=system_instruction,
            imagen_path=state.context.get("imagen_path")
        )

        # Las reglas mandan sobre el modelo: si hay alarma, la urgencia no puede quedar baja
        if eval_alarma["hay_alarma"]:
            resultado.nivel_urgencia = "emergencia"
            for alarma in eval_alarma["alarmas"]:
                if alarma not in resultado.senales_alarma:
                    resultado.senales_alarma.append(alarma)

        sugeridos = [c.nombre for c in resultado.centros]
        resultado.centros = filtrar_y_ubicar(resultado.centros, centros)
        state.context.setdefault("descartados", []).extend(n for n in sugeridos if n not in [c.nombre for c in resultado.centros])
        await completar_rutas(state, self.name, resultado.centros)

        # Acción: guardar la recomendación del centro más cercano
        if resultado.centros:
            elegido = min(resultado.centros, key=lambda c: c.duracion_s or c.distancia_m)
            lugar = next((c for c in centros if c["nombre"] == elegido.nombre), {})
            accion = await state.usar_herramienta(
                self.name, "guardar_recomendacion",
                caso_id=state.caso_id, lugar_id=lugar.get("id"), distancia_m=elegido.distancia_m,
                duracion_s=elegido.duracion_s, motivo=f"{resultado.especialidad_sugerida} · urgencia {resultado.nivel_urgencia}",
                fuente=elegido.fuente
            )
            state.registrar_accion("recomendacion_guardada", {"id": accion["recomendacion_id"], "lugar": elegido.nombre})

        state.context["salud"] = resultado
        log.info("Agente Salud completado", urgencia=resultado.nivel_urgencia)
        return resultado
