from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoExplora
from app.agents.comun import origen, filtrar_y_ubicar, texto_alertas
import app.tools.local  # noqa: F401
import app.tools.actions  # noqa: F401
import app.tools.geo  # noqa: F401
import json
import structlog

log = structlog.get_logger()


class ExploraAgent(BaseAgent):
    """Identifica lugares turísticos y arma un recorrido peatonal guardado en el sistema."""

    def __init__(self):
        super().__init__("ExploraAgent")

    async def _process(self, state: OrchestratorState):
        texto = state.context.get("texto_usuario", "")
        lat, lon = origen(state)

        puntos = await state.usar_herramienta(self.name, "consultar_puntos_interes", lat=lat, lon=lon, radio_m=5000)

        system_instruction = """
        Eres el agente Explora de ORBIS. Diseñas recorridos turísticos y peatonales en Bogotá.
        Con la petición del usuario (y la foto, si la hay, para reconocer el lugar) y la lista de puntos
        de interés cercanos, identifica el lugar que desea explorar o propone un recorrido ordenado.
        - Usa SOLAMENTE puntos de la lista y copia el nombre exactamente. Máximo 5 paradas.
        - Si la foto muestra un lugar que no está en la lista, dilo en contexto y pon requiere_confirmacion=true.
        - No calcules distancias: deja distancia_m, duracion_s, distancia_total_m y duracion_total_s en 0.
        - minutos_sugeridos es el tiempo de visita en cada parada, ajustado al tiempo disponible del usuario.
        """

        prompt = f"""
        Petición/Intereses: '{texto}'
        {texto_alertas(state)}

        Puntos de interés cercanos (datos propios):
        {json.dumps(puntos, indent=2, ensure_ascii=False)}
        """

        resultado: ResultadoExplora = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoExplora,
            system_instruction=system_instruction,
            imagen_path=state.context.get("imagen_path")
        )

        sugeridos = [p.nombre for p in resultado.paradas]
        resultado.paradas = filtrar_y_ubicar(resultado.paradas, puntos)
        state.context.setdefault("descartados", []).extend(n for n in sugeridos if n not in [p.nombre for p in resultado.paradas])
        resultado.paradas.sort(key=lambda p: p.orden)

        # Ruta real a pie entre paradas consecutivas (la primera desde la ubicación del usuario)
        for i, parada in enumerate(resultado.paradas):
            desde = (lat, lon) if i == 0 else (resultado.paradas[i - 1].lat, resultado.paradas[i - 1].lon)
            try:
                ruta = await state.usar_herramienta(self.name, "calcular_ruta", origen_lat=desde[0], origen_lon=desde[1],
                                                    destino_lat=parada.lat, destino_lon=parada.lon, modo="walk")
            except Exception:
                ruta = None
            if ruta:
                parada.distancia_m, parada.duracion_s, parada.ruta_verificada = ruta["distancia_m"], ruta["duracion_s"], True
        resultado.distancia_total_m = sum(p.distancia_m for p in resultado.paradas)
        resultado.duracion_total_s = sum(p.duracion_s + p.minutos_sugeridos * 60 for p in resultado.paradas)

        # Acción: guardar el recorrido
        if resultado.paradas:
            paradas_dict = [
                {"orden": p.orden, "poi_id": next((poi["id"] for poi in puntos if poi["nombre"] == p.nombre), None),
                 "nombre": p.nombre, "lat": p.lat, "lon": p.lon, "minutos_sugeridos": p.minutos_sugeridos}
                for p in resultado.paradas
            ]
            accion = await state.usar_herramienta(
                self.name, "guardar_recorrido",
                caso_id=state.caso_id, titulo=resultado.lugar_identificado or "Recorrido",
                distancia_total_m=resultado.distancia_total_m, duracion_total_s=resultado.duracion_total_s,
                paradas=paradas_dict
            )
            resultado.recorrido_id = accion["recorrido_id"]
            state.registrar_accion("recorrido_guardado", {"id": accion["recorrido_id"], "paradas": len(paradas_dict)})

        state.context["explora"] = resultado
        log.info("Agente Explora completado", recorrido_id=resultado.recorrido_id)
        return resultado
