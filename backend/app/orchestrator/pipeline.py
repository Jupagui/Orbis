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
        
        # 1. Triage
        await self.triage.run(state)
        
        triage_res = state.context.get("triage")
        if not triage_res:
            log.error("Triage no produjo resultados")
            return state
            
        if not triage_res.calidad_informacion.suficiente:
            log.warning("Información insuficiente para continuar")
            # Dejamos pasar al verificador para que le pida más info al usuario
            
        else:
            # 2. Geo
            await self.geo.run(state)
            
            # 3. Domain Agents
            intencion = triage_res.intencion
            log.info(f"Enrutando a dominio: {intencion}")
            
            agent = self.domain_agents.get(intencion)
            if agent:
                await agent.run(state)
            else:
                log.warning("Intención no soportada o indefinida")
            
        # 4. Verificador
        await self.verificador.run(state)
        
        log.info("Pipeline completado", caso_id=state.caso_id)
        return state
