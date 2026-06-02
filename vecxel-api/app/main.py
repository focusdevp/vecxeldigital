from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import connect_db, close_db
from .routers import inventario, logs, clientes
from .config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="Vecxel API",
    description="API interna de Vecxel Digital para gestión de inventario, clientes, cotizaciones y pedidos",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - permitir requests desde el dashboard Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(inventario.router)
app.include_router(logs.router)
app.include_router(clientes.router)

@app.get("/")
async def root():
    return {
        "service": "Vecxel API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
