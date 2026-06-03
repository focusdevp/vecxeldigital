"""
Router de API - Consultas de inventario
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.middleware import verify_api_key
from app.database import get_db
from app.models import ProductListResponse, ProductDetailResponse, Product
from app.models.client import ClientListResponse, ClientResponse

router = APIRouter(prefix="/api", tags=["API"])


@router.get("/inventario", response_model=ProductListResponse)
async def get_inventory(
    sku: Optional[str] = Query(None, description="Filtrar por SKU (búsqueda parcial)"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(100, ge=1, le=1000, description="Resultados por página"),
    _: str = Depends(verify_api_key)
):
    """
    Obtener listado de productos del inventario
    
    Query params:
    - sku: Búsqueda parcial por SKU (case-insensitive)
    - activo: Filtrar por productos activos/inactivos
    - page: Número de página (default: 1)
    - limit: Productos por página (default: 100, max: 1000)
    
    Returns:
    - Lista paginada de productos con metadata
    """
    db = get_db()
    
    # Construir filtro
    filter_query = {}
    
    if sku:
        # Búsqueda case-insensitive con regex
        filter_query["sku"] = {"$regex": sku, "$options": "i"}
    
    if activo is not None:
        filter_query["activo"] = activo
    
    # Calcular skip para paginación
    skip = (page - 1) * limit
    
    # Obtener total de documentos
    total = await db.products.count_documents(filter_query)
    
    # Obtener productos paginados
    cursor = db.products.find(filter_query).sort("sku", 1).skip(skip).limit(limit)
    products_data = await cursor.to_list(length=limit)
    
    # Convertir a modelos Pydantic
    products = []
    for product_data in products_data:
        # Remover _id de MongoDB para Pydantic
        product_data.pop('_id', None)
        try:
            products.append(Product(**product_data))
        except Exception as e:
            print(f"Error parseando producto: {e}")
            continue
    
    return ProductListResponse(
        success=True,
        total=total,
        pagina=page,
        por_pagina=limit,
        productos=products
    )


@router.get("/inventario/{sku}", response_model=ProductDetailResponse)
async def get_product_by_sku(
    sku: str,
    _: str = Depends(verify_api_key)
):
    """
    Obtener detalles de un producto específico por SKU
    
    Path params:
    - sku: SKU del producto (exacto, case-insensitive)
    
    Returns:
    - Detalles completos del producto
    
    Raises:
    - 404: Si el producto no existe
    """
    db = get_db()
    
    # Buscar producto (case-insensitive)
    product_data = await db.products.find_one({"sku": sku.upper()})
    
    if not product_data:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": f"Producto con SKU '{sku}' no encontrado."
            }
        )
    
    # Remover _id
    product_data.pop('_id', None)
    
    try:
        product = Product(**product_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": f"Error parseando producto: {str(e)}"
            }
        )
    
    return ProductDetailResponse(
        success=True,
        producto=product
    )


@router.get("/health")
async def health_check():
    """
    Health check endpoint - No requiere autenticación

    Útil para monitoreo y verificación de que el servicio está corriendo
    """
    from datetime import datetime

    return {
        "status": "ok",
        "service": "sac-connector-fastapi",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# ==================== CLIENTES ====================

@router.get("/clientes", response_model=ClientListResponse)
async def get_clientes(
    rif: Optional[str] = Query(None, description="Filtrar por RIF (búsqueda parcial)"),
    nombre: Optional[str] = Query(None, description="Filtrar por nombre (búsqueda parcial)"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(100, ge=1, le=1000, description="Resultados por página"),
    _: str = Depends(verify_api_key)
):
    """
    Obtener listado de clientes

    Query params:
    - rif: Búsqueda parcial por RIF (case-insensitive)
    - nombre: Búsqueda parcial por nombre (case-insensitive)
    - page: Número de página (default: 1)
    - limit: Clientes por página (default: 100, max: 1000)
    """
    db = get_db()

    filter_query = {"activo": True}

    if rif:
        filter_query["rif"] = {"$regex": rif, "$options": "i"}
    if nombre:
        filter_query["nombre"] = {"$regex": nombre, "$options": "i"}

    skip = (page - 1) * limit
    total = await db.clients.count_documents(filter_query)

    cursor = db.clients.find(filter_query).sort("nombre", 1).skip(skip).limit(limit)
    clientes_data = await cursor.to_list(length=limit)

    clientes = []
    for c in clientes_data:
        c.pop('_id', None)
        clientes.append(c)

    return ClientListResponse(
        success=True,
        total=total,
        pagina=page,
        por_pagina=limit,
        clientes=clientes
    )


@router.get("/clientes/{rif}", response_model=ClientResponse)
async def get_cliente_by_rif(
    rif: str,
    _: str = Depends(verify_api_key)
):
    """
    Obtener un cliente por RIF
    """
    db = get_db()

    cliente_data = await db.clients.find_one({"rif": rif.upper()})

    if not cliente_data:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "error": f"Cliente con RIF '{rif}' no encontrado."}
        )

    cliente_data.pop('_id', None)
    return ClientResponse(success=True, cliente=cliente_data)


@router.post("/clientes/nuevo")
async def create_cliente(
    cliente_data: dict,
    _: str = Depends(verify_api_key)
):
    """
    Registrar un nuevo cliente desde Vecxel API
    Guarda en BD y genera TXT en outbox/ para SAC
    """
    from app.services.client_generator import generate_clientes_file

    db = get_db()

    if not cliente_data.get("rif") or not cliente_data.get("nombre"):
        raise HTTPException(status_code=400, detail="RIF y nombre son obligatorios.")

    cliente_data["rif"] = cliente_data["rif"].upper().strip()
    cliente_data["nombre"] = cliente_data["nombre"].strip()
    cliente_data["origen"] = "vecxel"
    cliente_data["activo"] = True
    cliente_data["ultima_sincronizacion"] = datetime.utcnow()

    # Guardar en BD
    await db.clients.update_one(
        {"rif": cliente_data["rif"]},
        {"$set": cliente_data},
        upsert=True
    )

    # Generar TXT en outbox/
    try:
        archivo = generate_clientes_file([cliente_data])
    except Exception as e:
        print(f"[Clientes] Error generando TXT: {e}")
        archivo = None

    return {
        "success": True,
        "mensaje": "Cliente registrado correctamente.",
        "rif": cliente_data["rif"],
        "archivo_generado": archivo.get("nombre_archivo") if archivo else None
    }
