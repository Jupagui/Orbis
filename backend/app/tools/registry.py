from typing import Callable, Dict, Any, List
import inspect
import structlog

log = structlog.get_logger()

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        
    def register(self, func: Callable):
        name = func.__name__
        self._tools[name] = func
        log.info(f"Herramienta registrada: {name}")
        return func
        
    def get_tool(self, name: str) -> Callable:
        return self._tools.get(name)
        
    async def execute(self, name: str, **kwargs) -> Any:
        func = self.get_tool(name)
        if not func:
            raise ValueError(f"Herramienta no encontrada: {name}")
            
        log.info(f"Ejecutando herramienta: {name}", args=kwargs)
        if inspect.iscoroutinefunction(func):
            return await func(**kwargs)
        else:
            return func(**kwargs)
            
tool_registry = ToolRegistry()
