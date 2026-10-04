import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class Caso(Base):
    __tablename__ = "casos"
    id = Column(String, primary_key=True, default=generate_uuid)
    tipo = Column(String, index=True) # vial, salud, comida, taller, explora, indefinido
    estado = Column(String, default="recibido") # recibido, procesando, completado, requiere_info, error
    descripcion = Column(Text, nullable=True)
    imagen_path = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    direccion = Column(String, nullable=True)
    resultado_json = Column(Text, nullable=True)
    prioridad = Column(String, default="normal")
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    trazas = relationship("Traza", back_populates="caso", cascade="all, delete-orphan")
    recomendaciones = relationship("Recomendacion", back_populates="caso", cascade="all, delete-orphan")
    reporte_vial = relationship("ReporteVial", back_populates="caso", uselist=False, cascade="all, delete-orphan")
    solicitud_asistencia = relationship("SolicitudAsistencia", back_populates="caso", uselist=False, cascade="all, delete-orphan")
    recorrido = relationship("Recorrido", back_populates="caso", uselist=False, cascade="all, delete-orphan")

class Traza(Base):
    __tablename__ = "trazas"
    id = Column(Integer, primary_key=True, autoincrement=True)
    caso_id = Column(String, ForeignKey("casos.id", ondelete="CASCADE"), index=True)
    orden = Column(Integer, index=True)
    agente = Column(String)
    herramienta = Column(String, nullable=True)
    input_json = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True)
    duracion_ms = Column(Integer)
    estado = Column(String) # started, completed, error

    caso = relationship("Caso", back_populates="trazas")

class Lugar(Base):
    __tablename__ = "lugares"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False)
    categoria = Column(String, index=True) # hospital, clinica, restaurante, taller, montallantas
    subcategoria = Column(String, nullable=True)
    lat = Column(Float, index=True)
    lon = Column(Float, index=True)
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    precio_promedio = Column(Integer, nullable=True)
    rango_precio = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    horario = Column(String, nullable=True)

class Recomendacion(Base):
    __tablename__ = "recomendaciones"
    id = Column(Integer, primary_key=True, autoincrement=True)
    caso_id = Column(String, ForeignKey("casos.id", ondelete="CASCADE"))
    lugar_id = Column(Integer, ForeignKey("lugares.id", ondelete="CASCADE"))
    fuente = Column(String) # propia, geoapify
    distancia_m = Column(Integer, nullable=True)
    duracion_s = Column(Integer, nullable=True)
    puntaje = Column(Float, nullable=True)
    motivo = Column(Text, nullable=True)
    seleccionada = Column(Boolean, default=False)

    caso = relationship("Caso", back_populates="recomendaciones")
    lugar = relationship("Lugar")

class ReporteVial(Base):
    __tablename__ = "reportes_viales"
    id = Column(String, primary_key=True, default=generate_uuid)
    caso_id = Column(String, ForeignKey("casos.id", ondelete="CASCADE"))
    tipo_problema = Column(String)
    severidad = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    direccion = Column(String)
    barrio = Column(String, nullable=True)
    estado = Column(String, default="abierto") # abierto, asignado, resuelto

    caso = relationship("Caso", back_populates="reporte_vial")

class SolicitudAsistencia(Base):
    __tablename__ = "solicitudes_asistencia"
    id = Column(String, primary_key=True, default=generate_uuid)
    caso_id = Column(String, ForeignKey("casos.id", ondelete="CASCADE"))
    tipo_vehiculo = Column(String)
    falla_probable = Column(String)
    urgencia = Column(String)
    puede_conducir = Column(Boolean)
    lugar_id = Column(Integer, ForeignKey("lugares.id"), nullable=True)
    estado = Column(String, default="abierta") # abierta, asignada, atendida, cancelada

    caso = relationship("Caso", back_populates="solicitud_asistencia")
    taller = relationship("Lugar")

class Recorrido(Base):
    __tablename__ = "recorridos"
    id = Column(String, primary_key=True, default=generate_uuid)
    caso_id = Column(String, ForeignKey("casos.id", ondelete="CASCADE"))
    titulo = Column(String)
    distancia_total_m = Column(Integer)
    duracion_total_s = Column(Integer)
    modo = Column(String, default="walk")

    caso = relationship("Caso", back_populates="recorrido")
    paradas = relationship("ParadaRecorrido", back_populates="recorrido", cascade="all, delete-orphan")

class PuntoInteres(Base):
    __tablename__ = "puntos_interes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, nullable=False)
    categoria = Column(String, index=True) # monumento, museo, iglesia, plaza, mirador
    descripcion = Column(Text, nullable=True)
    lat = Column(Float, index=True)
    lon = Column(Float, index=True)
    horario = Column(String, nullable=True)
    costo_entrada = Column(Integer, nullable=True)

class ParadaRecorrido(Base):
    __tablename__ = "paradas_recorrido"
    id = Column(Integer, primary_key=True, autoincrement=True)
    recorrido_id = Column(String, ForeignKey("recorridos.id", ondelete="CASCADE"))
    orden = Column(Integer)
    poi_id = Column(Integer, ForeignKey("puntos_interes.id", ondelete="SET NULL"), nullable=True)
    nombre = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    minutos_sugeridos = Column(Integer)

    recorrido = relationship("Recorrido", back_populates="paradas")
    poi = relationship("PuntoInteres")

class Especialidad(Base):
    __tablename__ = "especialidades"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String, unique=True, nullable=False)

class LugarEspecialidad(Base):
    __tablename__ = "lugar_especialidad"
    lugar_id = Column(Integer, ForeignKey("lugares.id", ondelete="CASCADE"), primary_key=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="CASCADE"), primary_key=True)

class GuiaEstabilizacion(Base):
    __tablename__ = "guias_estabilizacion"
    id = Column(Integer, primary_key=True, autoincrement=True)
    condicion = Column(String, index=True)
    pasos = Column(Text) # JSON list
    que_no_hacer = Column(Text) # JSON list
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="CASCADE"), nullable=True)
