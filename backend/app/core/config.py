from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache

class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="dev", description="dev or prod")
    DEBUG: bool = Field(default=True)
    
    # DB
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./orbis.db")
    
    # APIs
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-3.1-flash-lite")
    # Se usan en orden si el modelo principal está saturado (503) o sin cuota (429)
    GEMINI_MODELOS_RESPALDO: str = Field(default="gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash")
    GEOAPIFY_API_KEY: str = Field(default="")

    # Imágenes subidas por el usuario
    UPLOADS_DIR: str = Field(default="./uploads")
    IMAGEN_LADO_MAXIMO: int = Field(default=1600)
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    
    # App info
    PROJECT_NAME: str = "ORBIS API"
    VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
