from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Almacen(BaseModel):
    codigo: str
    existencia: float = 0

class ClienteBase(BaseModel):
    rif: str
    nombre: str
    direccion: Optional[str] = ""
    telefonos: Optional[str] = ""
    email: Optional[str] = ""
    codigo_vendedor: Optional[str] = ""
    codigo_zona: Optional[str] = ""
    esquema_pago: Optional[str] = "CONTADO"

class ClienteCreate(ClienteBase):
    pass

class Cliente(ClienteBase):
    activo: Optional[bool] = True
    origen: Optional[str] = "vecxel"
    ultima_sincronizacion: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClienteResponse(BaseModel):
    success: bool
    cliente: dict

class ClienteListResponse(BaseModel):
    success: bool
    total: int
    pagina: int
    por_pagina: int
    clientes: List[dict]

class ClienteSyncRequest(BaseModel):
    clientes: List[dict]
    origen: Optional[str] = "sac"
    timestamp: Optional[str] = None

class ClienteSyncResponse(BaseModel):
    success: bool
    synced: int
    insertados: int
    actualizados: int
    errores: int
    duracion_ms: int
