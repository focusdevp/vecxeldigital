from pydantic import BaseModel, Field, field_validator
from typing import List
from datetime import datetime

class Almacen(BaseModel):
    """Modelo para almacén con stock"""
    codigo: str = Field(..., min_length=1, max_length=10)
    existencia: int = Field(..., ge=0, le=999999)

    class Config:
        json_schema_extra = {
            "example": {
                "codigo": "30",
                "existencia": 100
            }
        }

class Product(BaseModel):
    """Modelo de producto SAC"""
    sku: str = Field(..., min_length=1, max_length=20)
    descripcion: str = Field(..., min_length=1, max_length=100)
    unidad_medida: str = Field(..., min_length=1, max_length=10)
    precio_usd: float = Field(..., ge=0.0, le=999999.99)
    almacenes: List[Almacen] = Field(default_factory=list)
    activo: bool = Field(default=True)
    ultima_sincronizacion: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator('sku')
    @classmethod
    def sku_uppercase(cls, v: str) -> str:
        """Convertir SKU a mayúsculas"""
        return v.upper().strip()
    
    @field_validator('unidad_medida')
    @classmethod
    def unidad_uppercase(cls, v: str) -> str:
        """Convertir unidad de medida a mayúsculas"""
        return v.upper().strip()
    
    @field_validator('descripcion')
    @classmethod
    def descripcion_strip(cls, v: str) -> str:
        """Limpiar espacios de descripción"""
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "sku": "BISA100X42",
                "descripcion": "BISAGRA 100x42",
                "unidad_medida": "UND",
                "precio_usd": 1.50,
                "almacenes": [
                    {"codigo": "00", "existencia": 0},
                    {"codigo": "30", "existencia": 10},
                    {"codigo": "40", "existencia": 5}
                ],
                "activo": True
            }
        }

class ProductListResponse(BaseModel):
    """Respuesta para listado de productos"""
    success: bool = True
    total: int
    pagina: int = 1
    por_pagina: int = 100
    productos: List[Product]

class ProductDetailResponse(BaseModel):
    """Respuesta para detalle de producto"""
    success: bool = True
    producto: Product
