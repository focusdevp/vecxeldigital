from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ErrorDetail(BaseModel):
    """Detalle de error en procesamiento"""
    linea: int
    contenido: str = ""
    motivo: str

class SyncLog(BaseModel):
    """Log de sincronización"""
    tipo: str = Field(..., description="Tipo de operación: upload, download, etc.")
    entidad: str = Field(..., description="Entidad sincronizada: inventario, clientes, etc.")
    archivo: str
    archivo_path: Optional[str] = None
    checksum: Optional[str] = None
    inicio_procesamiento: datetime
    fin_procesamiento: datetime
    duracion_ms: int
    total_registros: int = 0
    registros_procesados: int = 0
    registros_error: int = 0
    errores: List[ErrorDetail] = Field(default_factory=list)
    estado: str = Field(..., description="Estado: exitoso, parcial, fallido")
    ip_origen: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "tipo": "upload",
                "entidad": "inventario",
                "archivo": "inventario_2026_06_03.txt",
                "inicio_procesamiento": "2026-06-03T08:00:00",
                "fin_procesamiento": "2026-06-03T08:01:00",
                "duracion_ms": 60000,
                "total_registros": 738,
                "registros_procesados": 738,
                "registros_error": 0,
                "estado": "exitoso"
            }
        }

class SyncLogListResponse(BaseModel):
    """Respuesta para listado de logs"""
    success: bool = True
    total: int
    pagina: int = 1
    logs: List[dict]
