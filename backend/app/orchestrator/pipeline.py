from app.orchestrator.state import OrchestratorState
from app.agents.triage import TriageAgent
from app.agents.geo import GeoAgent
from app.agents.via import VialAgent
from app.agents.salud import SaludAgent
from app.agents.sabor import SaborAgent
from app.agents.taller import TallerAgent
from app.agents.explora import ExploraAgent
from app.agents.verificador import VerificadorAgent
import structlog

log = structlog.get_logger()


class Pipeline:
    """Orquestador determinista: Triage -> (Geo -> agente de dominio) -> Verificador.
    El orden es fijo; la condición para avanzar la decide el resultado del Triage."""

    def __init__(self):
        self.triage = TriageAgent()
        self.geo = GeoAgent()
        self.verificador = VerificadorAgent()
        self.domain_agents = {
            "vial": VialAgent(),
            "salud": SaludAgent(),
            "comida": SaborAgent(),
            "taller": TallerAgent(),
            "explora": ExploraAgent()
        }

    async def run(self, state: OrchestratorState):
        log.info("Iniciando pipeline", caso_id=state.caso_id)

        # 1. Triage: clasifica y evalúa la calidad de la información
        await self.triage.run(state)
        triage_res = state.context["triage"]
        calidad = triage_res.calidad_informacion

        # 2. Ubicación (siempre, para que el caso quede geolocalizado aunque falte información)
        await self.geo.run(state)

        # 3. Agente de dominio solo si la información es suficiente y pertinente
        if calidad.suficiente and not calidad.fuera_de_contexto:
            agent = self.domain_agents.get(triage_res.intencion)
            if agent:
                log.info("Enrutando a dominio", intencion=triage_res.intencion)
                await agent.run(state)
            else:
                log.warning("Intención no soportada o indefinida")
        else:
            log.warning("Información insuficiente o fuera de contexto; se omite el agente de dominio")

        # 4. Verificador: control de calidad y respuesta final
        await self.verificador.run(state)

        log.info("Pipeline completado", caso_id=state.caso_id)
        return state
