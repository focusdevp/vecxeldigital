"""
SAC Connector FastAPI - Versión 2.0

Conector de sincronización bidireccional con SAC (Sistema Administrativo)
Migrado desde Express.js a FastAPI para unificar el stack en Python
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_to_mongo, close_mongo_connection
from app.routers import sync_router, api_router
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestor del ciclo de vida de la aplicación
    
    Ejecuta código al iniciar y al cerrar la aplicación
    """
    # Startup: Conectar a MongoDB
    await connect_to_mongo()
    print(f"[SAC Connector FastAPI] [OK] Servidor iniciado en puerto {settings.PORT}")
    
    yield
    
    # Shutdown: Cerrar conexión a MongoDB
    await close_mongo_connection()
    print("[SAC Connector FastAPI] Servidor detenido")


# Crear aplicación FastAPI
app = FastAPI(
    title="SAC Connector API",
    description="Conector de sincronización bidireccional con SAC (Sistema Administrativo)",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)


# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Registrar routers
app.include_router(sync_router)
app.include_router(api_router)


# Root endpoint
@app.get("/")
async def root():
    """
    Endpoint raíz - Información del servicio
    """
    return {
        "service": "SAC Connector FastAPI",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "sync": "/sync",
            "api": "/api",
            "health": "/api/health"
        }
    }


# Health check sin autenticación (accesible desde root también)
@app.get("/health")
async def health():
    """
    Health check global
    """
    from datetime import datetime
    
    return {
        "status": "ok",
        "service": "sac-connector-fastapi",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,  # Auto-reload en desarrollo
        log_level="info"
    )
