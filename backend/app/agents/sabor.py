from app.orchestrator.state import BaseAgent, OrchestratorState
from app.providers.ai import ai_provider
from app.schemas.domain import ResultadoSabor
from app.agents.comun import REGLA_GROUNDING, origen, filtrar_y_ubicar, completar_rutas, texto_alertas
import app.tools.local  # noqa: F401
import app.tools.actions  # noqa: F401
import app.tools.geo  # noqa: F401
from pydantic import BaseModel, Field
from typing import List
import json
import structlog

log = structlog.get_logger()

RADIO_A_PIE_M = 2000
# Radios que se prueban en orden hasta reunir suficientes lugares que coincidan con el antojo
RADIOS_PROGRESIVOS_M = [2000, 8000, 25000]
RADIO_CIUDAD_M = 25000
MAX_LUGARES = 10


class PlanBusquedaSabor(BaseModel):
    palabras_clave: List[str] = Field(description="1 a 4 palabras para buscar en el NOMBRE o tipo de cocina del lugar "
                                      "(ej. para 'caldo de gallina': ['caldo', 'gallina', 'piqueteadero']). "
                                      "Vacía si el usuario solo quiere comer algo sin plato específico.")
    sin_limite_distancia: bool = Field(description="True si el usuario dice que la distancia no importa, que puede "
                                       "desplazarse, o pide 'los mejores de la ciudad'.")
    cantidad: int = Field(description="Cuántos lugares pide el usuario (1 a 10). Si no lo dice, 3.")


class SaborAgent(BaseAgent):
    """Recomienda lugares de comida combinando datos propios y lugares reales del mapa."""

    def __init__(self):
        super().__init__("SaborAgent")

    async def _planear_busqueda(self, texto: str) -> PlanBusquedaSabor:
        try:
            plan = await ai_provider.generate_structured(
                prompt=f"Petición del usuario: '{texto}'",
                response_schema=PlanBusquedaSabor,
                system_instruction="Extraes parámetros de búsqueda de lugares de comida en Bogotá. "
                                   "Las palabras clave deben ser términos que aparecerían en el nombre de un "
                                   "restaurante colombiano que sirva ese plato (singular, sin artículos).",
            )
            plan.cantidad = max(1, min(plan.cantidad or 3, MAX_LUGARES))
            return plan
        except Exception as e:
            log.warning("No se pudo planear la búsqueda, se usa búsqueda general", error=str(e))
            return PlanBusquedaSabor(palabras_clave=[], sin_limite_distancia=False, cantidad=3)

    async def _buscar_por_antojo(self, state: OrchestratorState, plan: PlanBusquedaSabor, lat: float, lon: float):
        """Busca por palabra clave ampliando el radio hasta reunir suficientes coincidencias."""
        if not plan.palabras_clave:
            return [], RADIO_A_PIE_M
        radios = [RADIO_CIUDAD_M] if plan.sin_limite_distancia else RADIOS_PROGRESIVOS_M
        encontrados, radio = [], radios[0]
        for radio in radios:
            try:
                encontrados = await state.usar_herramienta(self.name, "buscar_lugares_por_texto",
                                                           palabras=plan.palabras_clave, lat=lat, lon=lon, radio_m=radio)
            except Exception as e:
                log.error("Falló la búsqueda por palabra clave", error=str(e), radio=radio)
                encontrados = []
            if len(encontrados) >= plan.cantidad:
                break
        return encontrados, radio

    async def _process(self, state: OrchestratorState):
        texto = state.context.get("texto_usuario", "")
        lat, lon = origen(state)

        # 0. Entender qué busca: plato concreto, cuántos lugares y si la distancia importa
        plan = await self._planear_busqueda(texto)
        log.info("Plan de búsqueda Sabor", palabras=plan.palabras_clave, sin_limite=plan.sin_limite_distancia,
                 cantidad=plan.cantidad)

        # 1. Lugares que coinciden con el antojo (nombre/cocina), con radio progresivo
        coincidencias, radio_usado = await self._buscar_por_antojo(state, plan, lat, lon)
        radio_general = max(RADIO_A_PIE_M, min(radio_usado, 5000)) if plan.sin_limite_distancia else RADIO_A_PIE_M

        # 2. Datos propios (tienen precio y rating verificados)
        propios = await state.usar_herramienta(self.name, "consultar_lugares_propios", categoria="restaurante", lat=lat, lon=lon, radio_m=radio_general)
        for r in propios:
            r["fuente"] = "propia"

        # 3. Restaurantes generales del mapa (respaldo si no hay coincidencias exactas)
        try:
            externos = await state.usar_herramienta(self.name, "buscar_lugares_externos", categoria="restaurante", lat=lat, lon=lon, radio_m=radio_general)
        except Exception as e:
            log.error("No se pudieron consultar lugares externos", error=str(e))
            externos = []

        # Combinar y eliminar duplicados por nombre (coincidencias y propios primero)
        vistos, restaurantes = set(), []
        for r in coincidencias + propios + externos:
            nombre = r["nombre"].lower().strip()
            if nombre not in vistos:
                vistos.add(nombre)
                restaurantes.append(r)
        restaurantes = restaurantes[:40]

        regla = REGLA_GROUNDING.replace("como máximo 3 lugares", f"como máximo {plan.cantidad} lugares")
        system_instruction = """
        Eres el agente Sabor de ORBIS. Encuentras lugares de comida según el antojo,
        tipo de cocina y presupuesto del usuario. Elige y ordena los restaurantes de la lista
        con un motivo corto de por qué fue elegido.
        PRIORIZA los lugares con coincide_busqueda=true: su nombre o cocina coincide con lo que pidió el usuario.
        Si faltan, completa con lugares generales que plausiblemente sirvan ese plato (ej. cocina colombiana,
        piqueteaderos, asaderos) e indícalo en el motivo ("posiblemente lo tenga").
        precio_verificado=true SOLO si el lugar trae precio_promedio en la lista; si no, precio_promedio=null.
        """ + regla

        prompt = f"""
        Antojo/Petición: '{texto}'
        Cantidad de lugares solicitada: {plan.cantidad}
        {texto_alertas(state)}

        Restaurantes disponibles (radio de búsqueda: {radio_usado // 1000} km):
        {json.dumps(restaurantes, indent=2, ensure_ascii=False)}
        """

        resultado: ResultadoSabor = await ai_provider.generate_structured(
            prompt=prompt,
            response_schema=ResultadoSabor,
            system_instruction=system_instruction,
            imagen_path=state.context.get("imagen_path")
        )

        sugeridos = [l.nombre for l in resultado.lugares]
        resultado.lugares = filtrar_y_ubicar(resultado.lugares, restaurantes)[:plan.cantidad]
        state.context.setdefault("descartados", []).extend(n for n in sugeridos if n not in [l.nombre for l in resultado.lugares])
        # A pie solo si todo queda cerca; si la búsqueda se amplió, se calcula en carro
        modo = "walk" if radio_usado <= RADIO_A_PIE_M and not plan.sin_limite_distancia else "drive"
        await completar_rutas(state, self.name, resultado.lugares, modo=modo)

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
