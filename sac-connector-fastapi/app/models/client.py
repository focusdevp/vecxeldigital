from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ClientBase(BaseModel):
    rif: str
    nombre: str
    direccion: Optional[str] = ""
    telefonos: Optional[str] = ""
    email: Optional[str] = ""
    codigo_vendedor: Optional[str] = ""
    codigo_zona: Optional[str] = ""
    esquema_pago: Optional[str] = "CONTADO"

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    activo: Optional[bool] = True
    origen: Optional[str] = "sac"
    ultima_sincronizacion: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClientResponse(BaseModel):
    success: bool
    cliente: dict

class ClientListResponse(BaseModel):
    success: bool
    total: int
    pagina: int
    por_pagina: int
    clientes: List[dict]

class ClientSyncRequest(BaseModel):
    clientes: List[dict]
    origen: Optional[str] = "sac"
    timestamp: Optional[str] = None

class ClientSyncResponse(BaseModel):
    success: bool
    synced: int
    insertados: int
    actualizados: int
    errores: int
    duracion_ms: int
