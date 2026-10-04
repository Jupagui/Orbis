from pydantic import BaseModel, Field
from typing import Optional

class CasoCreate(BaseModel):
    descripcion: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    direccion: Optional[str] = None
    tipo: Optional[str] = None
    
class CasoResponse(BaseModel):
    id: str
    estado: str
    mensaje: str
