"""
Script de testing para validar la migración Express → FastAPI

Compara los resultados de ambos servicios para asegurar compatibilidad
"""

import asyncio
import httpx
from pathlib import Path

# Configuración
EXPRESS_URL = "http://localhost:4000"
FASTAPI_URL = "http://localhost:4001"  # Temporal para testing paralelo
API_KEY = "clave_de_prueba"
HEADERS = {"X-API-Key": API_KEY}

# Archivo de prueba
TEST_FILE = Path("../sac-connector/test-files/formato_json.txt")


async def test_health_check():
    """Comparar health checks"""
    print("\n1️⃣  Testing Health Check...")
    
    async with httpx.AsyncClient() as client:
        # Express
        try:
            express_resp = await client.get(f"{EXPRESS_URL}/health")
            print(f"   Express: {express_resp.status_code} - {express_resp.json()}")
        except Exception as e:
            print(f"   Express: ERROR - {e}")
        
        # FastAPI
        try:
            fastapi_resp = await client.get(f"{FASTAPI_URL}/health")
            print(f"   FastAPI: {fastapi_resp.status_code} - {fastapi_resp.json()}")
        except Exception as e:
            print(f"   FastAPI: ERROR - {e}")


async def test_get_inventory():
    """Comparar consulta de inventario"""
    print("\n2️⃣  Testing GET /api/inventario...")
    
    async with httpx.AsyncClient() as client:
        # Express
        try:
            express_resp = await client.get(
                f"{EXPRESS_URL}/api/inventario?limit=5",
                headers=HEADERS
            )
            express_data = express_resp.json()
            print(f"   Express: {express_resp.status_code} - Total: {express_data.get('total', 0)} productos")
        except Exception as e:
            print(f"   Express: ERROR - {e}")
            express_data = None
        
        # FastAPI
        try:
            fastapi_resp = await client.get(
                f"{FASTAPI_URL}/api/inventario?limit=5",
                headers=HEADERS
            )
            fastapi_data = fastapi_resp.json()
            print(f"   FastAPI: {fastapi_resp.status_code} - Total: {fastapi_data.get('total', 0)} productos")
        except Exception as e:
            print(f"   FastAPI: ERROR - {e}")
            fastapi_data = None
        
        # Comparar
        if express_data and fastapi_data:
            if express_data.get('total') == fastapi_data.get('total'):
                print(f"   ✅ Mismo número de productos: {express_data.get('total')}")
            else:
                print(f"   ⚠️  Diferente número de productos: Express={express_data.get('total')}, FastAPI={fastapi_data.get('total')}")


async def test_get_product_by_sku():
    """Comparar consulta por SKU"""
    print("\n3️⃣  Testing GET /api/inventario/:sku...")
    
    # Primero obtener un SKU válido
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{EXPRESS_URL}/api/inventario?limit=1", headers=HEADERS)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('productos') and len(data['productos']) > 0:
                test_sku = data['productos'][0]['sku']
                print(f"   Testing con SKU: {test_sku}")
                
                # Express
                try:
                    express_resp = await client.get(
                        f"{EXPRESS_URL}/api/inventario/{test_sku}",
                        headers=HEADERS
                    )
                    express_product = express_resp.json()
                    print(f"   Express: {express_resp.status_code} - {express_product.get('producto', {}).get('descripcion', 'N/A')}")
                except Exception as e:
                    print(f"   Express: ERROR - {e}")
                    express_product = None
                
                # FastAPI
                try:
                    fastapi_resp = await client.get(
                        f"{FASTAPI_URL}/api/inventario/{test_sku}",
                        headers=HEADERS
                    )
                    fastapi_product = fastapi_resp.json()
                    print(f"   FastAPI: {fastapi_resp.status_code} - {fastapi_product.get('producto', {}).get('descripcion', 'N/A')}")
                except Exception as e:
                    print(f"   FastAPI: ERROR - {e}")
                    fastapi_product = None
                
                # Comparar precios
                if express_product and fastapi_product:
                    exp_price = express_product.get('producto', {}).get('precio_usd')
                    fast_price = fastapi_product.get('producto', {}).get('precio_usd')
                    if exp_price == fast_price:
                        print(f"   ✅ Mismo precio: ${exp_price}")
                    else:
                        print(f"   ⚠️  Precios diferentes: Express=${exp_price}, FastAPI=${fast_price}")


async def test_upload_inventory():
    """Comparar upload de inventario (solo si existe archivo de prueba)"""
    print("\n4️⃣  Testing POST /sync/inventario...")
    
    if not TEST_FILE.exists():
        print(f"   ⚠️  Archivo de prueba no encontrado: {TEST_FILE}")
        print(f"   Saltando test de upload...")
        return
    
    print(f"   Usando archivo: {TEST_FILE.name}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Leer archivo
        with open(TEST_FILE, 'rb') as f:
            file_content = f.read()
        
        files = {"file": (TEST_FILE.name, file_content, "text/plain")}
        
        # FastAPI (solo probar FastAPI para no duplicar datos)
        try:
            fastapi_resp = await client.post(
                f"{FASTAPI_URL}/sync/inventario",
                files=files,
                headers=HEADERS
            )
            fastapi_data = fastapi_resp.json()
            print(f"   FastAPI: {fastapi_resp.status_code}")
            if fastapi_resp.status_code == 200:
                print(f"   ✅ Procesados: {fastapi_data.get('registros_procesados', 0)}")
                print(f"   ✅ Errores: {fastapi_data.get('registros_error', 0)}")
                print(f"   ✅ Estado: {fastapi_data.get('estado', 'N/A')}")
            else:
                print(f"   ❌ Error: {fastapi_data}")
        except Exception as e:
            print(f"   FastAPI: ERROR - {e}")


async def run_all_tests():
    """Ejecutar todos los tests"""
    print("="*60)
    print("🧪 TESTING MIGRACIÓN EXPRESS → FASTAPI")
    print("="*60)
    
    await test_health_check()
    await test_get_inventory()
    await test_get_product_by_sku()
    await test_upload_inventory()
    
    print("\n" + "="*60)
    print("✅ Tests completados")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
