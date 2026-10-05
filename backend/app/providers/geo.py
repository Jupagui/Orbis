import re
import math
import time
import asyncio
import unicodedata
import httpx
import structlog
from app.core.config import get_settings
from tenacity import retry, wait_exponential, stop_after_attempt

settings = get_settings()
log = structlog.get_logger()

BOGOTA_LAT, BOGOTA_LON = 4.6097, -74.0817

NOMINATIM_HEADERS ={"User-Agent": "ORBIS_App_Academica/1.0 (Uniminuto)", "Accept": "application/json"}

OVERPASS_SERVIDORES = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# Categorías de Geoapify Places y su equivalente en OpenStreetMap (Overpass)
CATEGORIAS_EXTERNAS = {
    "restaurante": ("catering.restaurant,catering.cafe,catering.fast_food", '["amenity"~"restaurant|cafe|fast_food"]'),
    "hospital": ("healthcare.hospital,healthcare.clinic_or_praxis", '["amenity"~"hospital|clinic"]'),
    "taller": ("service.vehicle", '["shop"~"car_repair|tyres"]'),
}

# Tipos de OpenStreetMap que cuentan como lugar de comida en la búsqueda por texto
TIPOS_COMIDA_OSM = {"restaurant", "cafe", "fast_food", "food_court", "bar", "pub", "ice_cream", "bakery",
                    "deli", "pastry", "confectionery", "butcher", "greengrocer", "marketplace"}


def distancia_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Distancia en línea recta (metros). Solo para ordenar; la ruta real la da calcular_ruta."""
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return int(2 * r * math.asin(math.sqrt(a)))


def _sin_tildes(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def _regex_flexible(palabra: str) -> str:
    """'gallina' -> 'g[aá]ll[ií]n[aá]' para que coincida con o sin tildes en OpenStreetMap."""
    variantes = {"a": "[aá]", "e": "[eé]", "i": "[ií]", "o": "[oó]", "u": "[uúü]", "n": "[nñ]"}
    limpia = re.sub(r"[^a-z0-9 ]", "", _sin_tildes(palabra.lower()))
    return "".join(variantes.get(c, c) for c in limpia)


class GeoProvider:
    """Servicio externo de mapas: Geoapify si hay API key; si no, OpenStreetMap (Nominatim / Overpass / OSRM)."""

    def __init__(self):
        self.geoapify_key = settings.GEOAPIFY_API_KEY
        self.client = httpx.AsyncClient(timeout=10.0)
        self._overpass_pausa_hasta = 0.0

    # ---------- Geocodificación: texto -> coordenadas ----------
    @staticmethod
    def normalizar_direccion(text: str) -> str:
        """'Carrera 7 # 40-62' -> 'Carrera 7 40-62'. El símbolo # (o 'No.') de las direcciones
        colombianas hace que el geocodificador devuelva solo la calle, en cualquier parte de la ciudad."""
        return re.sub(r"\s*(#|No\.?|N[°º])\s*", " ", text, flags=re.IGNORECASE).strip()

    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def geocode(self, text: str) -> dict | None:
        text = self.normalizar_direccion(text)
        if not self.geoapify_key:
            return await self._nominatim_geocode(text)

        resp = await self.client.get("https://api.geoapify.com/v1/geocode/search", params={
            "text": text, "apiKey": self.geoapify_key, "format": "json", "limit": 1, "lang": "es",
            "filter": "countrycode:co", "bias": f"proximity:{BOGOTA_LON},{BOGOTA_LAT}"
        })
        resp.raise_for_status()
        results = resp.json().get("results")
        if not results:
            return None
        r = results[0]
        confianza = r.get("rank", {}).get("confidence", 0)
        return {
            "lat": r.get("lat"), "lon": r.get("lon"), "direccion": r.get("formatted"),
            "barrio": r.get("suburb") or r.get("neighbourhood"), "fuente": "geoapify",
            # Si solo encontró la calle o la ciudad, la ubicación es aproximada
            "aproximada": r.get("result_type") not in ("building", "amenity") or confianza < 0.7
        }

    async def _nominatim_geocode(self, text: str) -> dict | None:
        resp = await self.client.get("https://nominatim.openstreetmap.org/search", params={
            "q": text, "format": "json", "limit": 1, "addressdetails": 1
        }, headers=NOMINATIM_HEADERS)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        r = data[0]
        address = r.get("address", {})
        return {
            "lat": float(r["lat"]), "lon": float(r["lon"]), "direccion": r.get("display_name"),
            "barrio": address.get("suburb") or address.get("neighbourhood"), "fuente": "nominatim"
        }

    # ---------- Geocodificación inversa: coordenadas -> dirección ----------
    @retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(3))
    async def reverse_geocode(self, lat: float, lon: float) -> dict | None:
        if self.geoapify_key:
            resp = await self.client.get("https://api.geoapify.com/v1/geocode/reverse", params={
                "lat": lat, "lon": lon, "apiKey": self.geoapify_key, "format": "json", "lang": "es"
            })
            resp.raise_for_status()
            results = resp.json().get("results")
            if not results:
                return None
            r = results[0]
            return {"direccion": r.get("formatted"), "barrio": r.get("suburb") or r.get("neighbourhood"),
                    "fuente": "geoapify"}

        resp = await self.client.get("https://nominatim.openstreetmap.org/reverse", params={
            "lat": lat, "lon": lon, "format": "json", "addressdetails": 1
        }, headers=NOMINATIM_HEADERS)
        resp.raise_for_status()
        r = resp.json()
        if "error" in r:
            return None
        address = r.get("address", {})
        return {"direccion": r.get("display_name"),
                "barrio": address.get("suburb") or address.get("neighbourhood"), "fuente": "nominatim"}

    # ---------- Lugares reales cercanos ----------
    async def buscar_lugares(self, categoria: str, lat: float, lon: float, radio_m: int = 2000, limite: int = 15) -> list[dict]:
        if categoria not in CATEGORIAS_EXTERNAS:
            return []
        cat_geoapify, filtro_osm = CATEGORIAS_EXTERNAS[categoria]

        if self.geoapify_key:
            resp = await self.client.get("https://api.geoapify.com/v2/places", params={
                "categories": cat_geoapify, "filter": f"circle:{lon},{lat},{radio_m}",
                "bias": f"proximity:{lon},{lat}", "limit": limite, "apiKey": self.geoapify_key, "lang": "es"
            })
            resp.raise_for_status()
            lugares = []
            for f in resp.json().get("features", []):
                p = f["properties"]
                if not p.get("name"):
                    continue
                lugares.append({"nombre": p["name"], "direccion": p.get("formatted"),
                                "lat": p["lat"], "lon": p["lon"], "distancia_m": p.get("distance"),
                                "fuente": "geoapify"})
            return lugares

        # Fallback: Overpass (OpenStreetMap). Los servidores públicos se saturan seguido, por eso hay espejos.
        query = f'[out:json][timeout:10];node{filtro_osm}(around:{radio_m},{lat},{lon});out body {limite};'
        elementos = None
        for servidor in OVERPASS_SERVIDORES:
            try:
                resp = await self.client.post(servidor, data={"data": query}, headers=NOMINATIM_HEADERS)
                resp.raise_for_status()
                elementos = resp.json().get("elements", [])
                break
            except (httpx.HTTPError, ValueError) as e:
                log.warning("Overpass no disponible, probando otro servidor", servidor=servidor, error=str(e))
        if elementos is None:
            raise RuntimeError("Ningún servidor de OpenStreetMap (Overpass) respondió")
        lugares = []
        for el in elementos:
            tags = el.get("tags", {})
            if not tags.get("name"):
                continue
            lugares.append({"nombre": tags["name"], "direccion": tags.get("addr:street"),
                            "cocina": tags.get("cuisine"), "lat": el["lat"], "lon": el["lon"],
                            "fuente": "openstreetmap"})
        return lugares

    # ---------- Lugares por palabra clave (plato, nombre o tipo de cocina) ----------
    async def buscar_por_texto(self, palabras: list[str], lat: float, lon: float, radio_m: int = 10000,
                               limite: int = 40) -> list[dict]:
        """Busca lugares de comida cuyo nombre o tipo de cocina contenga alguna de las palabras
        (ej. 'caldo', 'gallina', 'ajiaco'). Sirve para antojos específicos que la búsqueda por
        categoría no encuentra."""
        palabras = [p.strip() for p in palabras if p and len(p.strip()) >= 3][:5]
        if not palabras:
            return []

        if self.geoapify_key:
            lugares = await self._geoapify_texto(palabras, lat, lon, radio_m, limite)
        else:
            resultados = await asyncio.gather(
                self._overpass_texto(palabras, lat, lon, radio_m, limite),
                self._nominatim_texto(palabras, lat, lon, radio_m, limite),
                return_exceptions=True,
            )
            lugares = []
            for r in resultados:
                if isinstance(r, Exception):
                    log.warning("Búsqueda por texto falló en un servicio", error=str(r))
                else:
                    lugares.extend(r)

        # Quitar duplicados y ordenar por cercanía
        vistos, unicos = set(), []
        for l in lugares:
            clave = _sin_tildes(l["nombre"].lower().strip())
            if clave in vistos:
                continue
            vistos.add(clave)
            l["distancia_aprox_m"] = distancia_haversine(lat, lon, l["lat"], l["lon"])
            if l["distancia_aprox_m"] <= radio_m:
                unicos.append(l)
        unicos.sort(key=lambda l: l["distancia_aprox_m"])
        return unicos[:limite]

    async def _geoapify_texto(self, palabras, lat, lon, radio_m, limite) -> list[dict]:
        lugares = []
        for palabra in palabras:
            resp = await self.client.get("https://api.geoapify.com/v2/places", params={
                "categories": "catering", "name": palabra, "filter": f"circle:{lon},{lat},{radio_m}",
                "bias": f"proximity:{lon},{lat}", "limit": limite, "apiKey": self.geoapify_key, "lang": "es"
            })
            resp.raise_for_status()
            for f in resp.json().get("features", []):
                p = f["properties"]
                if p.get("name"):
                    lugares.append({"nombre": p["name"], "direccion": p.get("formatted"), "lat": p["lat"],
                                    "lon": p["lon"], "fuente": "geoapify", "coincide_busqueda": True})
        return lugares

    async def _overpass_texto(self, palabras, lat, lon, radio_m, limite) -> list[dict]:
        patron = "|".join(_regex_flexible(p) for p in palabras)
        tipos = "|".join(sorted(TIPOS_COMIDA_OSM))
        # bbox es mucho más rápido que around en radios grandes; luego se filtra por distancia real
        d_lat = radio_m / 111000
        d_lon = radio_m / (111000 * max(math.cos(math.radians(lat)), 0.1))
        area = f"({lat - d_lat},{lon - d_lon},{lat + d_lat},{lon + d_lon})"
        query = (
            f'[out:json][timeout:20];('
            f'nwr["amenity"~"^({tipos})$"]["name"~"{patron}",i]{area};'
            f'nwr["amenity"="restaurant"]["cuisine"~"{patron}",i]{area};'
            f');out center {limite};'
        )
        if time.monotonic() < self._overpass_pausa_hasta:
            log.info("Overpass omitido temporalmente (falló hace poco)")
            return []
        for servidor in OVERPASS_SERVIDORES:
            try:
                resp = await self.client.post(servidor, data={"data": query}, headers=NOMINATIM_HEADERS, timeout=12.0)
                resp.raise_for_status()
                elementos = resp.json().get("elements", [])
                break
            except (httpx.HTTPError, ValueError) as e:
                log.warning("Overpass no disponible, probando otro servidor", servidor=servidor, error=str(e))
        else:
            self._overpass_pausa_hasta = time.monotonic() + 120
            return []
        lugares = []
        for el in elementos:
            tags = el.get("tags", {})
            la = el.get("lat") or el.get("center", {}).get("lat")
            lo = el.get("lon") or el.get("center", {}).get("lon")
            if not tags.get("name") or la is None:
                continue
            direccion = " ".join(filter(None, [tags.get("addr:street"), tags.get("addr:housenumber")])) or None
            lugares.append({"nombre": tags["name"], "direccion": direccion, "cocina": tags.get("cuisine"),
                            "horario": tags.get("opening_hours"), "telefono": tags.get("phone"),
                            "lat": la, "lon": lo, "fuente": "openstreetmap", "coincide_busqueda": True})
        return lugares

    async def _nominatim_texto(self, palabras, lat, lon, radio_m, limite) -> list[dict]:
        d_lat = radio_m / 111000
        d_lon = radio_m / (111000 * max(math.cos(math.radians(lat)), 0.1))
        viewbox = f"{lon - d_lon},{lat + d_lat},{lon + d_lon},{lat - d_lat}"
        lugares = []
        # Nominatim pide máximo 1 consulta por segundo
        for i, consulta in enumerate([" ".join(palabras)] + palabras[:2]):
            if i:
                await asyncio.sleep(1.1)
            resp = await self.client.get("https://nominatim.openstreetmap.org/search", params={
                "q": consulta, "format": "json", "limit": limite, "viewbox": viewbox, "bounded": 1,
                "addressdetails": 1, "countrycodes": "co"
            }, headers=NOMINATIM_HEADERS)
            resp.raise_for_status()
            for r in resp.json():
                if r.get("type") not in TIPOS_COMIDA_OSM or not r.get("name"):
                    continue
                lugares.append({"nombre": r["name"], "direccion": r.get("display_name"), "lat": float(r["lat"]),
                                "lon": float(r["lon"]), "fuente": "openstreetmap", "coincide_busqueda": True})
            if len(lugares) >= limite:
                break
        return lugares

    # ---------- Ruta real (distancia y tiempo) ----------
    @retry(wait=wait_exponential(multiplier=1, min=1, max=5), stop=stop_after_attempt(2))
    async def calcular_ruta(self, origen: tuple[float, float], destino: tuple[float, float], modo: str = "drive") -> dict | None:
        (lat1, lon1), (lat2, lon2) = origen, destino

        if self.geoapify_key:
            resp = await self.client.get("https://api.geoapify.com/v1/routing", params={
                "waypoints": f"{lat1},{lon1}|{lat2},{lon2}", "mode": modo, "apiKey": self.geoapify_key
            })
            resp.raise_for_status()
            features = resp.json().get("features")
            if not features:
                return None
            p = features[0]["properties"]
            return {"distancia_m": int(p["distance"]), "duracion_s": int(p["time"]), "fuente": "geoapify"}

        # Fallback: OSRM de FOSSGIS (OpenStreetMap), que tiene perfiles separados para carro y a pie
        servicio = "routed-foot/route/v1/foot" if modo == "walk" else "routed-car/route/v1/driving"
        resp = await self.client.get(
            f"https://routing.openstreetmap.de/{servicio}/{lon1},{lat1};{lon2},{lat2}",
            params={"overview": "false"}, headers=NOMINATIM_HEADERS
        )
        resp.raise_for_status()
        routes = resp.json().get("routes")
        if not routes:
            return None
        return {"distancia_m": int(routes[0]["distance"]), "duracion_s": int(routes[0]["duration"]), "fuente": "osrm"}

    async def close(self):
        await self.client.aclose()


geo_provider = GeoProvider()
