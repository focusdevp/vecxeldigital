import asyncio
import sys
sys.path.insert(0, '.')

from app.clients.sac_connector import SACConnectorClient

async def test():
    print("=== Test directo del cliente SAC Connector ===\n")
    client = SACConnectorClient()
    
    try:
        print("Llamando a get_inventario()...")
        result = await client.get_inventario(limit=2)
        print(f"\nResultado:")
        print(f"  Total: {result.get('total')}")
        print(f"  Productos: {len(result.get('productos', []))}")
        if result.get('productos'):
            print(f"  Primer SKU: {result['productos'][0].get('sku')}")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test())
