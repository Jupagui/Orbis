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
    barrio: Optional[str] = None
    fuente: str = Field(description="gps, geoapify, nominatim o referencia")

# Campos comunes de un lugar recomendado. lat/lon, distancia y tiempo los completa
# el sistema con datos reales (no el modelo).
class LugarBase(BaseModel):
    nombre: str
    distancia_m: int = 0
    duracion_s: int = 0
    lat: Optional[float] = None
    lon: Optional[float] = None
    ruta_verificada: bool = False

class CentroSaludResult(LugarBase):
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

class LugarSaborResult(LugarBase):
    precio_promedio: Optional[int]
    precio_verificado: bool
    rating: Optional[float]
    motivo: str
    fuente: str = "propia"

class ResultadoSabor(BaseModel):
    antojo: str
    tipo_cocina: str
    presupuesto_max: Optional[int]
    restricciones: List[str]
    lugares: List[LugarSaborResult]

class TallerResult(LugarBase):
    servicios: List[str]
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

class ParadaResult(LugarBase):
    orden: int
    minutos_sugeridos: int
    descripcion: Optional[str] = None

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

class Verificacion(BaseModel):
    aprobado: bool
    advertencias: List[str] = Field(default_factory=list)
    lugares_descartados: List[str] = Field(default_factory=list)
    fuentes: List[str] = Field(default_factory=list)

class RespuestaFinal(BaseModel):
    caso_id: str
    intencion: str
    confianza: float
    resumen: str
    observacion_imagen: Optional[str] = None
    ubicacion: Optional[UbicacionResuelta] = None
    calidad_informacion: Optional[CalidadInformacion] = None
    
    # Solo uno de estos estará presente dependiendo del dominio
    salud: Optional[ResultadoSalud] = None
    sabor: Optional[ResultadoSabor] = None
    taller: Optional[ResultadoTaller] = None
    vial: Optional[ResultadoVial] = None
    explora: Optional[ResultadoExplora] = None
    
    acciones: List[Any] = Field(default_factory=list)
    verificacion: Optional[Verificacion] = None
