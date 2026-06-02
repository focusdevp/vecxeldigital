import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    try:
        print("Conectando a MongoDB...")
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client.vecxeldigital
        
        print(f"Base de datos: {db.name}")
        
        collections = await db.list_collection_names()
        print(f"Colecciones: {collections}")
        
        count = await db.products.count_documents({})
        print(f"Total productos: {count}")
        
        if count > 0:
            producto = await db.products.find_one()
            print(f"SKU: {producto.get('sku')}")
        
        client.close()
        print("Test completado")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
