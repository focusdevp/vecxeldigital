from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ErrorDetail(BaseModel):
    linea: Optional[int] = None
    contenido: Optional[str] = None
    motivo: Optional[str] = None

class SyncLog(BaseModel):
    tipo: str
    entidad: str
    archivo: Optional[str] = None
    archivo_path: Optional[str] = None
    checksum: Optional[str] = None
    inicio_procesamiento: Optional[datetime] = None
    fin_procesamiento: Optional[datetime] = None
    duracion_ms: Optional[int] = None
    total_registros: int = 0
    registros_procesados: int = 0
    registros_error: int = 0
    errores: List[ErrorDetail] = []
    estado: str
    fail_reason: Optional[str] = None
    sacok: bool = False
    ip_origen: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class SyncLogListResponse(BaseModel):
    success: bool
    total: int
    pagina: int
    logs: List[SyncLog]
