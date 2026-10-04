from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoExplora
from app.tools.local import consultar_puntos_interes
from app.tools.actions import guardar_recorrido
import structlog
import json

log = structlog.get_logger()

class ExploraAgent(BaseAgent):
    def __init__(self):
        super().__init__("ExploraAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        texto = state.context.get("texto_usuario", "")
        ubicacion = state.context.get("ubicacion")
        
        lat = ubicacion.lat if ubicacion else 4.6097
        lon = ubicacion.lon if ubicacion else -74.0817
        
        puntos = await consultar_puntos_interes(lat, lon, radio_m=5000)
        
        system_instruction = """
        Eres el agente Explora de ORBIS. Diseñas recorridos turísticos y peatonales en Bogotá.
        Con la petición del usuario y la lista de puntos de interés cercanos, debes identificar
        el lugar que desea explorar o proponer un recorrido ordenado y coherente.
        
        Asegúrate de calcular la distancia desde el anterior y los minutos sugeridos por parada.
        La duración total debe coincidir aproximadamente con el tiempo disponible indicado o inferido.
        
        REGLA: SIEMPRE debes retornar AL MENOS 3 paradas o lugares sugeridos.
        """
        
        alertas_comunitarias = "\n".join(state.context.get("alertas_comunitarias", []))
        alerta_text = f"ALERTAS EN LA ZONA:\n{alertas_comunitarias}\nConsidera advertir al usuario si es relevante." if alertas_comunitarias else ""
        
        prompt = f"""
        Petición/Intereses: '{texto}'
        {alerta_text}
        
        Puntos de interés cercanos:
        {json.dumps(puntos, indent=2)}
        """
        
        resultado: ResultadoExplora = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoExplora,
            system_instruction=system_instruction
        )
        
        # Acción: Guardar el recorrido
        if resultado.paradas:
            paradas_dict = []
            for p in resultado.paradas:
                poi_id = next((poi["id"] for poi in puntos if poi["nombre"] == p.nombre), None)
                paradas_dict.append({
                    "orden": p.orden,
                    "poi_id": poi_id,
                    "nombre": p.nombre,
                    "lat": next((poi["lat"] for poi in puntos if poi["nombre"] == p.nombre), lat),
                    "lon": next((poi["lon"] for poi in puntos if poi["nombre"] == p.nombre), lon),
                    "minutos_sugeridos": p.minutos_sugeridos
                })
                
            accion = await guardar_recorrido(
                caso_id=state.caso_id,
                titulo=resultado.lugar_identificado or "Recorrido",
                distancia_total_m=resultado.distancia_total_m,
                duracion_total_s=resultado.duracion_total_s,
                paradas=paradas_dict
            )
            resultado.recorrido_id = accion["recorrido_id"]
            
        state.context["explora"] = resultado
        log.info("Agente Explora completado", recorrido_id=resultado.recorrido_id)
