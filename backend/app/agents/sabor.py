from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoSabor
from app.tools.local import consultar_lugares_propios
import structlog
import json

log = structlog.get_logger()

class SaborAgent(BaseAgent):
    def __init__(self):
        super().__init__("SaborAgent")
        
    async def _process(self, state: OrchestratorState) -> None:
        texto = state.context.get("texto_usuario", "")
        ubicacion = state.context.get("ubicacion")
        
        lat = ubicacion.lat if ubicacion else 4.6097
        lon = ubicacion.lon if ubicacion else -74.0817
        
        # 1. Obtener restaurantes de la DB Local
        restaurantes_db = await consultar_lugares_propios("restaurante", lat, lon, radio_m=5000)
        
        # 2. Obtener restaurantes reales de OpenStreetMap (locales en la zona)
        restaurantes_reales = []
        try:
            import httpx
            from app.tools.local import haversine_distance
            query = f"""
            [out:json][timeout:10];
            (
              node["amenity"~"restaurant|cafe|fast_food"](around:2000,{lat},{lon});
            );
            out body 15;
            """
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post("https://overpass-api.de/api/interpreter", data=query)
                if resp.status_code == 200:
                    data = resp.json()
                    for el in data.get("elements", []):
                        tags = el.get("tags", {})
                        name = tags.get("name")
                        if not name: continue
                        
                        dist = haversine_distance(lat, lon, el.get("lat"), el.get("lon"))
                        restaurantes_reales.append({
                            "nombre": name,
                            "tipo": tags.get("amenity", "local"),
                            "cocina": tags.get("cuisine", "comida local"),
                            "distancia_m": int(dist),
                            "direccion": tags.get("addr:street", "En la zona")
                        })
        except Exception as e:
            log.error("Error Overpass API", error=str(e))
            
        # Combinar y eliminar duplicados por nombre
        vistos = set()
        restaurantes = []
        for r in (restaurantes_db + restaurantes_reales):
            name_lower = r["nombre"].lower().strip()
            if name_lower not in vistos:
                vistos.add(name_lower)
                restaurantes.append(r)
                
        restaurantes.sort(key=lambda x: x.get("distancia_m", 9999))
        restaurantes = restaurantes[:25] # Damos 25 opciones reales a la IA
        
        system_instruction = """
        Eres el agente Sabor de ORBIS. Tu tarea es encontrar los mejores lugares de comida cercanos
        según el antojo, tipo de cocina y presupuesto del usuario.
        Debes elegir y rankear los restaurantes usando SOLAMENTE la lista proporcionada.
        Para cada lugar, proporciona un motivo corto y persuasivo de por qué fue elegido.
        Si en la lista hay un precio promedio, márcalo como 'precio_verificado': true.
        
        REGLA: SIEMPRE debes retornar AL MENOS 3 restaurantes sugeridos de la lista proporcionada.
        """
        
        alertas_comunitarias = "\n".join(state.context.get("alertas_comunitarias", []))
        alerta_text = f"ALERTAS EN LA ZONA:\n{alertas_comunitarias}\nConsidera advertir al usuario si es relevante." if alertas_comunitarias else ""
        
        prompt = f"""
        Antojo/Petición: '{texto}'
        {alerta_text}
        
        Restaurantes cercanos disponibles:
        {json.dumps(restaurantes, indent=2)}
        """
        
        resultado: ResultadoSabor = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoSabor,
            system_instruction=system_instruction
        )
        
        state.context["sabor"] = resultado
        log.info("Agente Sabor completado", tipo_cocina=resultado.tipo_cocina)
