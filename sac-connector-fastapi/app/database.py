from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import get_settings
from typing import Optional

settings = get_settings()

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

db_instance = Database()

async def connect_to_mongo():
    """Conectar a MongoDB"""
    print(f"[SAC Connector FastAPI] Conectando a MongoDB: {settings.MONGODB_URI}")
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_instance.db = db_instance.client.get_default_database()
    print(f"[SAC Connector FastAPI] [OK] Conectado a MongoDB: {db_instance.db.name}")

async def close_mongo_connection():
    """Cerrar conexión a MongoDB"""
    if db_instance.client:
        db_instance.client.close()
        print("[SAC Connector FastAPI] Desconectado de MongoDB")

def get_db() -> AsyncIOMotorDatabase:
    """Obtener instancia de la base de datos"""
    if db_instance.db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return db_instance.db
