from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    port: int = 8000
    mongodb_uri: str
    api_key: str
    sac_connector_url: str = "http://localhost:4000"
    sac_connector_api_key: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
