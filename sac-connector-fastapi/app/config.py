from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Configuración de la aplicación desde variables de entorno"""
    PORT: int = 4000
    MONGODB_URI: str
    API_KEY: str
    VECXEL_API_URL: str = ""
    VECXEL_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """Singleton de configuración"""
    return Settings()
