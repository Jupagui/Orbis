import httpx
import structlog
from app.core.config import get_settings
from tenacity import retry, wait_exponential, stop_after_attempt

settings = get_settings()
log = structlog.get_logger()

class GeoProvider:
    def __init__(self):
        self.geoapify_key = settings.GEOAPIFY_API_KEY
        self.client = httpx.AsyncClient(timeout=10.0)
        
    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def geocode(self, text: str) -> dict:
        if not self.geoapify_key:
            return await self._nominatim_geocode(text)
            
        url = "https://api.geoapify.com/v1/geocode/search"
        params = {
            "text": text,
            "apiKey": self.geoapify_key,
            "format": "json",
            "limit": 1
        }
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        
        if not data.get("results"):
            return None
            
        result = data["results"][0]
        return {
            "lat": result.get("lat"),
            "lon": result.get("lon"),
            "direccion": result.get("formatted"),
            "barrio": result.get("suburb") or result.get("neighbourhood"),
            "fuente": "geoapify"
        }
        
    async def _nominatim_geocode(self, text: str) -> dict:
        # Fallback a Nominatim (OSM)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": text,
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }
        headers = {"User-Agent": "ORBIS_App_Academica/1.0"}
        resp = await self.client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        
        if not data:
            return None
            
        result = data[0]
        address = result.get("address", {})
        return {
            "lat": float(result.get("lat")),
            "lon": float(result.get("lon")),
            "direccion": result.get("display_name"),
            "barrio": address.get("suburb") or address.get("neighbourhood"),
            "fuente": "nominatim"
        }

    async def close(self):
        await self.client.aclose()

geo_provider = GeoProvider()
