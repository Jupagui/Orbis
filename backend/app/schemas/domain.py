from pydantic import BaseModel, Field
from typing import List, Optional, Any

class CalidadInformacion(BaseModel):
    suficiente: bool = Field(description="¿Los datos y la imagen son suficientes para entender el problema?")
    contradicciones: List[str] = Field(default_factory=list, description="Lista de contradicciones encontradas")
    datos_faltantes: List[str] = Field(default_factory=list, description="Datos necesarios que faltan")
    fuera_de_contexto: bool = Field(description="¿El caso reportado es irrelevante para una app urbana?")

class EntidadReconocida(BaseModel):
    nombre: str
    tipo: str
    confianza: float = Field(ge=0, le=1.0)

class ResultadoTriage(BaseModel):
    intencion: str = Field(description="Una de: vial, salud, comida, taller, explora, indefinido")
    confianza: float = Field(ge=0, le=1.0)
    resumen: str = Field(description="Breve resumen del problema del usuario")
    calidad_informacion: CalidadInformacion
    entidades: List[EntidadReconocida] = Field(default_factory=list)
    observacion_imagen: Optional[str] = Field(default=None, description="Lo que se observa en la imagen, si se proporcionó")

# Base para los agentes de dominio
class UbicacionResuelta(BaseModel):
    texto: str = Field(description="Dirección o barrio legible")
    lat: float
    lon: float
    fuente: str = Field(description="gps, exif, texto, o nominatim")

class CentroSaludResult(BaseModel):
    nombre: str
    distancia_m: int
    duracion_s: int
    telefono: Optional[str]
    fuente: str

class ResultadoSalud(BaseModel):
    nivel_urgencia: str = Field(description="baja, media, alta, emergencia")
    especialidad_sugerida: str
    senales_alarma: List[str]
    recomendaciones_estabilizacion: List[str]
    que_no_hacer: List[str]
    centros: List[CentroSaludResult]
    aviso: str = Field(default="Esta orientación no reemplaza la valoración médica.")

class LugarSaborResult(BaseModel):
    nombre: str
    precio_promedio: Optional[int]
    precio_verificado: bool
    rating: Optional[float]
    distancia_m: int
    motivo: str

class ResultadoSabor(BaseModel):
    antojo: str
    tipo_cocina: str
    presupuesto_max: Optional[int]
    restricciones: List[str]
    lugares: List[LugarSaborResult]

class TallerResult(BaseModel):
    nombre: str
    servicios: List[str]
    distancia_m: int
    duracion_s: int
    telefono: Optional[str]

class ResultadoTaller(BaseModel):
    tipo_vehiculo: str
    falla_probable: str
    testigos_detectados: List[str]
    urgencia: str
    puede_conducir: bool
    pasos_seguridad: List[str]
    que_no_hacer: List[str]
    talleres: List[TallerResult]
    solicitud_id: Optional[str] = None

class ResultadoVial(BaseModel):
    tipo_problema: str
    severidad: str
    riesgo: str
    entidad_sugerida: str
    duplicados_cercanos: int
    reporte_id: Optional[str] = None

class ParadaResult(BaseModel):
    orden: int
    nombre: str
    minutos_sugeridos: int
    distancia_desde_anterior_m: int

class ResultadoExplora(BaseModel):
    lugar_identificado: str
    confianza: float
    requiere_confirmacion: bool
    contexto: str
    fuente_contexto: str
    tiempo_disponible_min: int
    intereses: List[str]
    paradas: List[ParadaResult]
    distancia_total_m: int
    duracion_total_s: int
    recorrido_id: Optional[str] = None

class RespuestaFinal(BaseModel):
    caso_id: str
    intencion: str
    confianza: float
    resumen: str
    observacion_imagen: Optional[str] = None
    ubicacion: Optional[UbicacionResuelta] = None
    calidad_informacion: CalidadInformacion
    
    # Solo uno de estos estará presente dependiendo del dominio
    salud: Optional[ResultadoSalud] = None
    sabor: Optional[ResultadoSabor] = None
    taller: Optional[ResultadoTaller] = None
    vial: Optional[ResultadoVial] = None
    explora: Optional[ResultadoExplora] = None
    
    acciones: List[Any] = Field(default_factory=list)
