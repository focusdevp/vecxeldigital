import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        try:
            print("Probando conexión a SAC Connector...")
            response = await client.get(
                'http://localhost:4000/api/inventario?limit=1',
                headers={'X-API-Key': 'clave_de_prueba'},
                timeout=30.0
            )
            print(f"Status: {response.status_code}")
            data = response.json()
            print(f"Response: {data}")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test())
