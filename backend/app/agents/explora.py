from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoExplora, ParadaResult
from app.agents.comun import origen, filtrar_y_ubicar, texto_alertas
from app.tools.local import haversine
import app.tools.local  # noqa: F401
import app.tools.actions  # noqa: F401
import app.tools.geo  # noqa: F401
import json
import structlog

log = structlog.get_logger()

MAX_A_PIE_M = 2500


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
        - Si la foto o el texto muestran un lugar ESPECÍFICO que no está en la lista, escribe su nombre propio
          en nombre_propio (p. ej. 'Ichiraku Ramen', 'Museo Botero') para que el sistema lo busque en el mapa,
          y pon requiere_confirmacion=true. Nunca escribas su dirección: el sistema la consulta.
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

        # Lugar específico reconocido (foto/texto) que no está en los datos propios: se busca en el mapa
        nombres_paradas = {p.nombre.lower() for p in resultado.paradas}
        if resultado.nombre_propio and resultado.nombre_propio.lower() not in nombres_paradas:
            try:
                lugar = await state.usar_herramienta(self.name, "buscar_lugar_por_nombre",
                                                     nombre=resultado.nombre_propio, lat=lat, lon=lon)
            except Exception:
                lugar = None
            if lugar:
                resultado.paradas.insert(0, ParadaResult(
                    orden=0, nombre=lugar["nombre"], minutos_sugeridos=60, descripcion=lugar["direccion"],
                    lat=lugar["lat"], lon=lugar["lon"], fuente=lugar["fuente"]
                ))
                resultado.requiere_confirmacion = False
                # Ya no cuenta como descartado: se verificó con el servicio de mapas
                descartados = state.context.get("descartados", [])
                state.context["descartados"] = [d for d in descartados if d.lower() != resultado.nombre_propio.lower()]
            else:
                state.context["lugar_no_ubicado"] = resultado.nombre_propio
        for i, p in enumerate(resultado.paradas, start=1):
            p.orden = i

        # Ruta real entre paradas consecutivas (la primera desde la ubicación del usuario).
        # Tramos largos se calculan en carro: nadie camina 20 km para llegar a la primera parada.
        for i, parada in enumerate(resultado.paradas):
            desde = (lat, lon) if i == 0 else (resultado.paradas[i - 1].lat, resultado.paradas[i - 1].lon)
            parada.modo = "walk" if haversine(desde[0], desde[1], parada.lat, parada.lon) <= MAX_A_PIE_M else "drive"
            try:
                ruta = await state.usar_herramienta(self.name, "calcular_ruta", origen_lat=desde[0], origen_lon=desde[1],
                                                    destino_lat=parada.lat, destino_lon=parada.lon, modo=parada.modo)
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
