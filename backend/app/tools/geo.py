"""Herramientas que usan el servicio externo de mapas (Geoapify / OpenStreetMap)."""
from app.providers.geo import geo_provider
from app.tools.registry import tool_registry


@tool_registry.register
async def geocodificar_direccion(direccion: str):
    """Convierte una dirección escrita en coordenadas."""
    return await geo_provider.geocode(direccion)


@tool_registry.register
async def identificar_direccion(lat: float, lon: float):
    """Convierte coordenadas GPS en una dirección legible y barrio."""
    return await geo_provider.reverse_geocode(lat, lon)


@tool_registry.register
async def buscar_lugares_externos(categoria: str, lat: float, lon: float, radio_m: int = 2000):
    """Busca lugares reales cercanos (restaurantes, hospitales, talleres) en el servicio de mapas."""
    return await geo_provider.buscar_lugares(categoria, lat, lon, radio_m)


@tool_registry.register
async def calcular_ruta(origen_lat: float, origen_lon: float, destino_lat: float, destino_lon: float, modo: str = "drive"):
    """Distancia y tiempo reales por vía entre dos puntos."""
    return await geo_provider.calcular_ruta((origen_lat, origen_lon), (destino_lat, destino_lon), modo)
