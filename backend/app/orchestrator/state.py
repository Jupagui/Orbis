from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
import structlog

log = structlog.get_logger()

class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"

class OrchestratorState:
    def __init__(self, caso_id: str):
        self.caso_id = caso_id
        self.current_step: Optional[str] = None
        self.trazas: List[Dict[str, Any]] = []
        self.context: Dict[str, Any] = {}
        
    def add_trace(self, agente: str, herramienta: Optional[str], input_json: Any, output_json: Any, duracion_ms: int, estado: str):
        trace = {
            "orden": len(self.trazas) + 1,
            "agente": agente,
            "herramienta": herramienta,
            "input_json": input_json,
            "output_json": output_json,
            "duracion_ms": duracion_ms,
            "estado": estado
        }
        self.trazas.append(trace)
        log.info("Trace added", caso_id=self.caso_id, agente=agente, estado=estado)
        # TODO: Here we could trigger a callback to SSE
        
class BaseAgent:
    def __init__(self, name: str):
        self.name = name
        
    async def run(self, state: OrchestratorState) -> None:
        start_time = datetime.now()
        try:
            state.current_step = self.name
            await self._process(state)
            duracion = int((datetime.now() - start_time).total_seconds() * 1000)
            state.add_trace(self.name, None, "input", "completed", duracion, "completed")
        except Exception as e:
            duracion = int((datetime.now() - start_time).total_seconds() * 1000)
            state.add_trace(self.name, None, "input", str(e), duracion, "error")
            raise
            
    async def _process(self, state: OrchestratorState) -> None:
        raise NotImplementedError
