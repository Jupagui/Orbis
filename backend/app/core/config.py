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
    GEOAPIFY_API_KEY: str = Field(default="")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    
    # App info
    PROJECT_NAME: str = "ORBIS API"
    VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
