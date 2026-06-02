import httpx
from typing import Optional
from ..config import settings

class SACConnectorClient:
    """Cliente HTTP para comunicarse con SAC Connector"""
    
    def __init__(self):
        self.base_url = settings.sac_connector_url
        self.headers = {
            "X-API-Key": settings.sac_connector_api_key
        }
        print(f"[SAC Client] Inicializado con URL: {self.base_url}")
    
    async def get_inventario(
        self, 
        sku: Optional[str] = None,
        activo: Optional[bool] = None,
        page: int = 1,
        limit: int = 100
    ):
        """Obtiene inventario desde SAC Connector"""
        params = {"page": page, "limit": limit}
        if sku:
            params["sku"] = sku
        if activo is not None:
            params["activo"] = activo
        
        url = f"{self.base_url}/api/inventario"
        print(f"[SAC Client] GET {url} con params: {params}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self.headers,
                params=params,
                timeout=30.0
            )
            print(f"[SAC Client] Status: {response.status_code}")
            data = response.json()
            print(f"[SAC Client] Total productos: {data.get('total', 0)}")
            response.raise_for_status()
            return data
    
    async def get_producto_by_sku(self, sku: str):
        """Obtiene un producto específico por SKU desde SAC Connector"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/inventario/{sku}",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def get_logs(
        self,
        page: int = 1,
        limit: int = 20,
        entidad: Optional[str] = None,
        estado: Optional[str] = None
    ):
        """Obtiene logs de sincronización desde SAC Connector"""
        params = {"page": page, "limit": limit}
        if entidad:
            params["entidad"] = entidad
        if estado:
            params["estado"] = estado
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/sync/logs",
                headers=self.headers,
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

    async def create_cliente(self, cliente: dict):
        """Envía un nuevo cliente a SAC Connector → genera TXT en outbox/"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/clientes/nuevo",
                headers=self.headers,
                json=cliente,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
