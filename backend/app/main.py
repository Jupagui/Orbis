from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.db import engine
from app.models.base import Base
from app.models import domain # Ensure models are loaded for Base.metadata.create_all
from app.seed.datos_iniciales import seed_data
from app.providers.geo import geo_provider

settings = get_settings()
log = setup_logging(json_logs=settings.ENVIRONMENT == "prod", log_level=settings.LOG_LEVEL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Iniciando ORBIS API", version=settings.VERSION, env=settings.ENVIRONMENT)
    # create tables (for dev only, normally use alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Datos propios (lugares, especialidades, guías, puntos de interés); se omite si ya existen
    await seed_data()

    yield

    log.info("Apagando ORBIS API")
    await geo_provider.close()
    await engine.dispose()

from app.api.v1.casos import router as casos_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.include_router(casos_router, prefix="/api/v1")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}
