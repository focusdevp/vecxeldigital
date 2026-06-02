from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client.vecxel_app
    print(f"[MongoDB] Conectado a: {db.name}")

async def close_db():
    global client
    if client:
        client.close()
        print("[MongoDB] Desconectado")

def get_db():
    return db
