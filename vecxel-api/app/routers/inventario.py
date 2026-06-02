from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from datetime import datetime
import time
from ..models.product import (
    Product, 
    ProductResponse, 
    ProductListResponse,
    InventarioSyncRequest,
    InventarioSyncResponse
)
from ..middleware.auth import verify_api_key
from ..database import get_db

router = APIRouter(prefix="/inventario", tags=["Inventario"])

@router.post("/sync", response_model=InventarioSyncResponse)
async def sync_inventario_from_sac(
    data: InventarioSyncRequest,
    _: str = Depends(verify_api_key)
):
    """
    Sincroniza inventario desde SAC Connector a la BD local de Vecxel.
    Solo debe ser llamado por SAC Connector después de validar y guardar.
    """
    inicio = time.time()
    db = get_db()
    
    insertados = 0
    actualizados = 0
    errores = 0
    
    try:
        for producto in data.productos:
            try:
                # Calcular stock total
                stock_total = sum(alm.existencia for alm in producto.almacenes)
                
                # Preparar datos para upsert
                producto_dict = producto.dict()
                producto_dict['ultima_sync_sac'] = datetime.utcnow()
                producto_dict['stock_total'] = stock_total
                producto_dict['updatedAt'] = datetime.utcnow()
                
                # Buscar si existe
                existe = await db.productos.find_one({"sku": producto.sku})
                
                if existe:
                    # Actualizar producto existente
                    await db.productos.update_one(
                        {"sku": producto.sku},
                        {"$set": producto_dict}
                    )
                    actualizados += 1
                else:
                    # Insertar nuevo producto
                    producto_dict['createdAt'] = datetime.utcnow()
                    await db.productos.insert_one(producto_dict)
                    insertados += 1
                    
            except Exception as e:
                print(f"Error procesando SKU {producto.sku}: {str(e)}")
                errores += 1
        
        duracion = int((time.time() - inicio) * 1000)
        
        print(f"[Sync] Completado: {insertados} insertados, {actualizados} actualizados, {errores} errores")
        
        return {
            "success": True,
            "synced": insertados + actualizados,
            "insertados": insertados,
            "actualizados": actualizados,
            "errores": errores,
            "duracion_ms": duracion
        }
        
    except Exception as e:
        print(f"[Sync] Error crítico: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en sincronización: {str(e)}")


@router.get("", response_model=ProductListResponse)
async def get_inventario(
    sku: Optional[str] = None,
    activo: Optional[bool] = True,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    _: str = Depends(verify_api_key)
):
    """
    Obtiene lista de productos del inventario desde BD local de Vecxel.
    Ahora consulta directamente vecxel_app_db en lugar de HTTP a SAC Connector.
    """
    try:
        db = get_db()
        
        # Construir filtro
        filtro = {}
        if activo is not None:
            filtro["activo"] = activo
        if sku:
            filtro["sku"] = {"$regex": sku, "$options": "i"}
        
        # Contar total
        total = await db.productos.count_documents(filtro)
        
        # Calcular skip
        skip = (page - 1) * limit
        
        # Obtener productos paginados
        cursor = db.productos.find(filtro).skip(skip).limit(limit)
        productos = await cursor.to_list(length=limit)
        
        # Limpiar _id de MongoDB para serialización
        for p in productos:
            if '_id' in p:
                del p['_id']
        
        print(f"[Inventario] Query exitoso: {len(productos)} productos de {total} totales")
        
        return {
            "success": True,
            "total": total,
            "pagina": page,
            "por_pagina": limit,
            "productos": productos
        }
        
    except Exception as e:
        print(f"[Inventario] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al obtener inventario: {str(e)}")


@router.get("/{sku}", response_model=ProductResponse)
async def get_producto_by_sku(
    sku: str,
    _: str = Depends(verify_api_key)
):
    """
    Obtiene un producto específico por SKU desde BD local de Vecxel.
    """
    try:
        db = get_db()
        producto = await db.productos.find_one({"sku": sku.upper(), "activo": True})
        
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {sku} no encontrado")
        
        # Limpiar _id
        if '_id' in producto:
            del producto['_id']
        
        return {
            "success": True,
            "producto": producto
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Inventario] Error obteniendo SKU {sku}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
