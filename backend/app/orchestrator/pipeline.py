from typing import TypedDict
from langgraph.graph import StateGraph, START, END

from app.orchestrator.state import OrchestratorState
from app.agents.triage import TriageAgent
from app.agents.geo import GeoAgent
from app.agents.via import VialAgent
from app.agents.salud import SaludAgent
from app.agents.sabor import SaborAgent
from app.agents.taller import TallerAgent
from app.agents.explora import ExploraAgent
from app.agents.verificador import VerificadorAgent
from app.agents.comun import FACTOR_RADIO
import structlog

log = structlog.get_logger()

# Intención que devuelve el Triage -> nodo del agente especializado en el grafo
NODO_POR_INTENCION = {
    "vial": "vial",
    "salud": "salud",
    "comida": "sabor",
    "taller": "taller",
    "explora": "explora",
}


# Ciclo de reintento: agentes que buscan lugares por radio. Sabor queda fuera porque ya amplía
# su radio por dentro (2 → 8 → 25 km) y Vial porque no busca lugares.
# Los umbrales (MIN_CANDIDATOS, MAX_REINTENTOS, FACTOR_RADIO) están en agents/comun.py.
AGENTES_CON_REINTENTO = {"salud", "taller", "explora"}


class EstadoGrafo(TypedDict):
    """Estado que viaja de nodo en nodo. Es el mismo OrchestratorState de siempre
    (contexto, trazas y acciones); cada agente lo lee y lo modifica."""
    orq: OrchestratorState


class Pipeline:
    """Orquestador construido con LangGraph:

        START -> (triage ‖ geo, en paralelo) -> decidir -> (arista condicional) -> agente especializado -> verificador -> END
                                                   └─ información insuficiente o fuera de contexto ─────> verificador
        Salud, Taller y Explora tienen un ciclo: si no encuentran lugares, vuelven a ejecutarse una vez con más radio.

    Cada nodo ejecuta uno de los agentes existentes. La arista condicional decide,
    con el resultado del Triage, qué agente especializado participa."""

    def __init__(self):
        self.agentes = {
            "triage": TriageAgent(),
            "geo": GeoAgent(),
            "vial": VialAgent(),
            "salud": SaludAgent(),
            "sabor": SaborAgent(),
            "taller": TallerAgent(),
            "explora": ExploraAgent(),
            "verificador": VerificadorAgent(),
        }
        self.grafo = self._construir_grafo()

    def _nodo(self, nombre: str):
        """Envuelve un agente como nodo del grafo."""
        agente = self.agentes[nombre]

        async def ejecutar(estado: EstadoGrafo) -> dict:
            await agente.run(estado["orq"])
            return {}

        return ejecutar

    @staticmethod
    def decidir_ruta(estado: EstadoGrafo) -> str:
        """Arista condicional: a qué nodo ir después de Triage y Geo. Queda registrada en la traza."""
        orq = estado["orq"]
        triage = orq.context["triage"]
        calidad = triage.calidad_informacion

        if calidad.contradicciones:
            # Ej.: el texto habla de un hueco y la foto es un teclado. No se ejecuta ninguna acción.
            destino, motivo = "verificador", "contradicción entre la información recibida"
        elif not calidad.suficiente or calidad.fuera_de_contexto:
            destino, motivo = "verificador", "información insuficiente o fuera de contexto"
        elif triage.intencion in NODO_POR_INTENCION:
            destino, motivo = NODO_POR_INTENCION[triage.intencion], f"intención '{triage.intencion}'"
        else:
            destino, motivo = "verificador", f"intención '{triage.intencion}' sin agente especializado"

        orq.add_trace(
            "Orquestador (LangGraph)", None,
            {"intencion": triage.intencion, "suficiente": calidad.suficiente,
             "fuera_de_contexto": calidad.fuera_de_contexto, "contradicciones": len(calidad.contradicciones)},
            {"siguiente_nodo": destino, "motivo": motivo},
            0, "completed",
        )
        log.info("Ruta decidida", destino=destino, motivo=motivo)
        return destino

    @staticmethod
    def revisar_resultado(estado: EstadoGrafo) -> str:
        """Arista condicional después de Salud, Taller y Explora: forma un ciclo.
        Si el agente pidió reintento (sus herramientas encontraron menos de MIN_CANDIDATOS lugares,
        ver agents/comun.py: pedir_reintento), vuelve al mismo agente una sola vez con radio ×FACTOR_RADIO.
        Si había candidatos y el modelo decidió no recomendar (p. ej. Taller con humo: alejarse y
        llamar al 123), no reintenta."""
        orq = estado["orq"]
        clave = NODO_POR_INTENCION[orq.context["triage"].intencion]
        resultado = orq.context.get(clave)
        lugares = (getattr(resultado, "centros", None) or getattr(resultado, "talleres", None)
                   or getattr(resultado, "paradas", None) or []) if resultado is not None else []
        candidatos = orq.context.get("candidatos_encontrados", 0)
        reintentos = orq.context.get("reintentos", 0)

        if orq.context.pop("necesita_reintento", False):
            orq.context["reintentos"] = reintentos + 1
            orq.context["factor_radio"] = FACTOR_RADIO
            # Lo que se descartó en el primer intento ya no aplica: el agente vuelve a empezar
            orq.context["descartados"] = []
            orq.context.pop("lugar_no_ubicado", None)
            destino = "reintentar"
            motivo = f"solo {candidatos} candidatos encontrados: reintentar con radio ×{FACTOR_RADIO}"
        else:
            destino = "verificador"
            motivo = (f"{len(lugares)} lugares verificados ({candidatos} candidatos)" if lugares
                      else f"sin lugares recomendados ({candidatos} candidatos{', ya se reintentó' if reintentos else ''})")

        orq.add_trace(
            "Orquestador (LangGraph)", None,
            {"agente": clave, "lugares": len(lugares), "candidatos": candidatos, "reintentos": reintentos},
            {"siguiente_nodo": clave if destino == "reintentar" else "verificador", "motivo": motivo},
            0, "completed",
        )
        log.info("Revisión de resultado", agente=clave, destino=destino, motivo=motivo)
        return destino

    def _construir_grafo(self):
        g = StateGraph(EstadoGrafo)
        for nombre in self.agentes:
            g.add_node(nombre, self._nodo(nombre))
        # Punto de unión: espera a que Triage y Geo terminen antes de decidir la ruta
        g.add_node("decidir", lambda estado: {})

        # Triage y Geo corren en paralelo: Geo no necesita nada del Triage
        g.add_edge(START, "triage")
        g.add_edge(START, "geo")
        g.add_edge(["triage", "geo"], "decidir")

        # Decidir -> agente especializado (o directo al verificador si no hay información suficiente)
        destinos = {n: n for n in set(NODO_POR_INTENCION.values())} | {"verificador": "verificador"}
        g.add_conditional_edges("decidir", self.decidir_ruta, destinos)

        for nodo in sorted(set(NODO_POR_INTENCION.values())):
            if nodo in AGENTES_CON_REINTENTO:
                # Ciclo: el agente puede volver a ejecutarse una vez con un radio más amplio
                g.add_conditional_edges(nodo, self.revisar_resultado, {"reintentar": nodo, "verificador": "verificador"})
            else:
                g.add_edge(nodo, "verificador")
        g.add_edge("verificador", END)
        return g.compile()

    def diagrama_mermaid(self) -> str:
        """Diagrama del grafo generado por LangGraph (para el README y la presentación).
        draw_mermaid() omite las aristas que vuelven al mismo nodo, así que se agregan las del ciclo de reintento."""
        grafo = self.grafo.get_graph()
        mermaid = grafo.draw_mermaid()
        ciclos = [f"\t{e.source} -. reintento .-> {e.target};" for e in grafo.edges if e.source == e.target]
        marcador = "\tclassDef default"
        if ciclos and marcador in mermaid:
            mermaid = mermaid.replace(marcador, "\n".join(ciclos) + "\n" + marcador, 1)
        return mermaid

    async def run(self, state: OrchestratorState):
        log.info("Iniciando grafo", caso_id=state.caso_id)
        await self.grafo.ainvoke({"orq": state})
        log.info("Grafo completado", caso_id=state.caso_id)
        return state
