from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Almacen(BaseModel):
    codigo: str
    existencia: int

class Product(BaseModel):
    sku: str
    descripcion: str
    unidad_medida: str
    precio_usd: float
    almacenes: List[Almacen]
    activo: bool = True
    ultima_sincronizacion: Optional[datetime] = None
    ultima_sync_sac: Optional[datetime] = None  # Última sincronización desde SAC
    origen: str = "sac"  # Origen de los datos (sac, manual, etc)
    stock_total: int = 0  # Stock total calculado
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProductResponse(BaseModel):
    success: bool
    producto: Product

class ProductListResponse(BaseModel):
    success: bool
    total: int
    pagina: int
    por_pagina: int
    productos: List[Product]

class InventarioSyncRequest(BaseModel):
    productos: List[Product]
    origen: str = "sac"
    timestamp: datetime

class InventarioSyncResponse(BaseModel):
    success: bool
    synced: int
    insertados: int
    actualizados: int
    errores: int
    duracion_ms: int
