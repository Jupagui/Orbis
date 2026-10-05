from app.providers.ai import ai_provider
import json
import structlog

log = structlog.get_logger()

SYSTEM_CHAT = """
Eres el asistente de chat de ORBIS para UN caso ya analizado en Bogotá.
Respondes preguntas de seguimiento usando ÚNICAMENTE:
1) el resultado del caso, 2) los datos que devolvieron las herramientas (datos propios y servicio de mapas)
y 3) lo que el usuario haya dicho en esta conversación.

Reglas:
- Si la respuesta no está en esa información, dilo claramente ("No tengo ese dato verificado") y sugiere
  cómo obtenerlo. Nunca inventes teléfonos, horarios, precios, direcciones, distancias ni tiempos.
- Cuando des un dato, indica de dónde sale (p. ej. "según el servicio de mapas", "según nuestros datos").
- La UBICACIÓN DEL USUARIO es desde donde pregunta: NUNCA la presentes como la dirección de otro lugar.
  La dirección de un lugar solo puede salir de un registro de ESE lugar (sus campos direccion/descripcion,
  lat/lon) en el resultado o en las herramientas. Si un lugar no tiene dirección verificada, dilo.
- En temas de salud no diagnosticas; ante señales de alarma recuerda la línea 123.
- Responde en español, breve y claro.
"""


def construir_contexto(resultado: dict, trazas: list) -> str:
    # Las herramientas que resuelven la ubicación del usuario ya van rotuladas arriba
    herramientas = [
        {"agente": t.agente, "herramienta": t.herramienta, "entrada": t.input_json, "salida": t.output_json}
        for t in trazas if t.herramienta and t.estado == "completed"
        and t.herramienta not in ("identificar_direccion", "geocodificar_direccion")
    ]
    # La ubicación del usuario va aparte y rotulada, para que el modelo no la confunda con la de un lugar
    resultado = dict(resultado)
    ubicacion_usuario = resultado.pop("ubicacion", None)
    return (
        "UBICACIÓN DEL USUARIO (desde donde consulta; NO es la dirección de ningún lugar):\n"
        + json.dumps(ubicacion_usuario, ensure_ascii=False)
        + "\n\nRESULTADO DEL CASO:\n" + json.dumps(resultado, ensure_ascii=False, indent=1)
        + "\n\nDATOS CONSULTADOS POR LAS HERRAMIENTAS:\n" + json.dumps(herramientas, ensure_ascii=False, indent=1)
    )


async def responder(resultado: dict, trazas: list, historial: list[dict], pregunta: str) -> str:
    system = SYSTEM_CHAT + "\n\n" + construir_contexto(resultado, trazas)
    return await ai_provider.generate_chat(system, historial, pregunta)
