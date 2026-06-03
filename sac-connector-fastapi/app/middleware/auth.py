from fastapi import Header, HTTPException, status
from app.config import get_settings

settings = get_settings()

async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """
    Middleware para verificar API Key en headers
    
    Args:
        x_api_key: API Key del header X-API-Key
        
    Raises:
        HTTPException: Si la API Key no es válida
    """
    if x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return x_api_key
