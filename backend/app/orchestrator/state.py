from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
import json
import time
import structlog
from app.tools.registry import tool_registry

log = structlog.get_logger()

MAX_TRAZA_CHARS = 4000


def a_json(valor: Any) -> str:
    """Serializa entradas/salidas para guardarlas en la traza (recortadas para no llenar la BD)."""
    if hasattr(valor, "model_dump"):
        valor = valor.model_dump()
    texto = json.dumps(valor, ensure_ascii=False, default=str)
    return texto if len(texto) <= MAX_TRAZA_CHARS else texto[:MAX_TRAZA_CHARS] + "…"


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
        # Acciones ejecutadas en el sistema (reporte creado, solicitud abierta, etc.)
        self.acciones: List[Dict[str, Any]] = []

    def add_trace(self, agente: str, herramienta: Optional[str], input_json: Any, output_json: Any, duracion_ms: int, estado: str):
        trace = {
            "orden": len(self.trazas) + 1,
            "agente": agente,
            "herramienta": herramienta,
            "input_json": a_json(input_json),
            "output_json": a_json(output_json),
            "duracion_ms": duracion_ms,
            "estado": estado
        }
        self.trazas.append(trace)
        log.info("Trace added", caso_id=self.caso_id, agente=agente, herramienta=herramienta, estado=estado)

    async def usar_herramienta(self, agente: str, nombre: str, **kwargs) -> Any:
        """Ejecuta una herramienta registrada y deja constancia en la traza de quién la usó y con qué datos."""
        inicio = time.perf_counter()
        try:
            resultado = await tool_registry.execute(nombre, **kwargs)
            self.add_trace(agente, nombre, kwargs, resultado, int((time.perf_counter() - inicio) * 1000), "completed")
            return resultado
        except Exception as e:
            self.add_trace(agente, nombre, kwargs, str(e), int((time.perf_counter() - inicio) * 1000), "error")
            raise

    def registrar_accion(self, tipo: str, detalle: Dict[str, Any]):
        self.acciones.append({"tipo": tipo, **detalle})


class BaseAgent:
    def __init__(self, name: str):
        self.name = name

    async def run(self, state: OrchestratorState) -> None:
        start_time = datetime.now()
        state.current_step = self.name
        try:
            salida = await self._process(state)
            duracion = int((datetime.now() - start_time).total_seconds() * 1000)
            state.add_trace(self.name, None, self.describir_entrada(state), salida or "completado", duracion, "completed")
        except Exception as e:
            duracion = int((datetime.now() - start_time).total_seconds() * 1000)
            state.add_trace(self.name, None, self.describir_entrada(state), str(e), duracion, "error")
            raise

    def describir_entrada(self, state: OrchestratorState) -> Dict[str, Any]:
        """Resumen de lo que recibe el agente (se guarda en la traza)."""
        ubicacion = state.context.get("ubicacion")
        return {
            "texto_usuario": state.context.get("texto_usuario"),
            "tiene_imagen": bool(state.context.get("imagen_path")),
            "ubicacion": ubicacion.texto if ubicacion else None,
        }

    async def _process(self, state: OrchestratorState) -> Any:
        """Debe devolver el resultado del agente (queda como salida en la traza)."""
        raise NotImplementedError
