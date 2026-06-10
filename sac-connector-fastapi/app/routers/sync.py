"""
Router de sincronización - Upload y procesamiento de archivos SAC
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pathlib import Path
import hashlib
import httpx

from app.middleware import verify_api_key
from app.database import get_db
from app.services import parse_inventory_file, validate_inventory_file
from app.services.client_parser import parse_clientes_file
from app.services.client_generator import generate_clientes_file
from app.services.client_validator import validate_clientes_file
from app.models import ErrorDetail
from app.config import get_settings
from app.utils.timezone import now_ve, ve_iso, ve_filename_timestamp, one_hour_ago_ve
from pymongo import UpdateOne

router = APIRouter(prefix="/sync", tags=["Sincronización"])
settings = get_settings()

# Crear directorio de storage si no existe
STORAGE_DIR = Path("storage/uploads")
FAILED_DIR = STORAGE_DIR / "failed"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
FAILED_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/inventario")
async def upload_inventory(
    request: Request,
    file: UploadFile = File(...),
    _: str = Depends(verify_api_key)
):
    """
    Subir y procesar archivo de inventario SAC
    
    El archivo debe estar en formato TXT con separador punto y coma (;)
    Formato: SKU;DESCRIPCION;UNIDAD;PRECIO;COD_ALM1;STOCK1;COD_ALM2;STOCK2;...
    
    Implementa validación robusta en 5 capas:
    1. Validación de archivo (encoding, tamaño)
    2. Validación de estructura
    3. Validación de formato SAC
    4. Validación de reglas de negocio
    5. Validación de integridad
    """
    inicio_procesamiento = now_ve()
    db = get_db()
    
    if not file:
        raise HTTPException(status_code=400, detail="No se recibió ningún archivo.")
    
    # Leer archivo
    file_content = await file.read()
    
    try:
        # VALIDACIÓN ROBUSTA - 5 CAPAS DE SEGURIDAD
        validation_report = await validate_inventory_file(file_content, file.filename)
        
        # Si la validación falla, rechazar inmediatamente
        if not validation_report["isValid"]:
            # Guardar log de fallo
            errores_formateados = [
                ErrorDetail(
                    linea=idx + 1,
                    contenido="",
                    motivo=error if isinstance(error, str) else str(error)
                )
                for idx, error in enumerate(validation_report["errores"][:50])
            ]
            
            failed_storage_path = FAILED_DIR / f"{ve_filename_timestamp()}_{file.filename}"
            with open(failed_storage_path, "wb") as failed_file:
                failed_file.write(file_content)

            fin_procesamiento = now_ve()
            await db.synclogs.insert_one({
                "tipo": "upload",
                "entidad": "inventario",
                "archivo": file.filename,
                "archivo_path": str(failed_storage_path),
                "fail_reason": " | ".join(str(e) for e in validation_report.get("errores", [])[:3]),
                "inicio_procesamiento": inicio_procesamiento,
                "fin_procesamiento": fin_procesamiento,
                "duracion_ms": int((fin_procesamiento - inicio_procesamiento).total_seconds() * 1000),
                "total_registros": validation_report.get("estructura", {}).get("lineas_totales", 0),
                "registros_procesados": 0,
                "registros_error": validation_report.get("estructura", {}).get("lineas_totales", 0),
                "errores": [e.dict() for e in errores_formateados],
                "estado": "fallido",
                "ip_origen": request.client.host if request.client else None,
                "createdAt": now_ve()
            })
            
            raise HTTPException(
                status_code=422,
                detail={
                    "success": False,
                    "codigo_error": "VALIDATION_FAILED",
                    "mensaje": "El archivo no cumple con los requisitos de validación",
                    "validaciones": validation_report,
                    "timestamp": ve_iso(fin_procesamiento)
                }
            )
        
        # Advertencias (no bloquean el procesamiento)
        if validation_report.get("advertencias"):
            print(f"[ADVERTENCIA] Archivo {file.filename} tiene {len(validation_report['advertencias'])} advertencias")
            for warning in validation_report["advertencias"][:5]:
                print(f"  - {warning}")
        
        # Archivo válido, continuar con procesamiento
        # Usar el encoding detectado por el validador
        detected_encoding = validation_report.get("archivo", {}).get("encoding", "utf-8")
        try:
            content = file_content.decode(detected_encoding)
        except (UnicodeDecodeError, AttributeError):
            # Fallback a latin-1 si falla
            content = file_content.decode('latin-1')
        checksum = hashlib.md5(content.encode()).hexdigest()
        
        # Verificar duplicados recientes (última hora)
        one_hour_ago = one_hour_ago_ve()
        
        duplicate = await db.synclogs.find_one({
            "checksum": checksum,
            "estado": {"$ne": "fallido"},
            "createdAt": {"$gte": one_hour_ago}
        })
        
        if duplicate:
            # Guardar log de duplicado
            failed_storage_path = FAILED_DIR / f"{ve_filename_timestamp()}_{file.filename}"
            with open(failed_storage_path, "wb") as failed_file:
                failed_file.write(file_content)

            fin_procesamiento = now_ve()
            duplicate_log = await db.synclogs.insert_one({
                "tipo": "upload",
                "entidad": "inventario",
                "archivo": file.filename,
                "archivo_path": str(failed_storage_path),
                "checksum": checksum,
                "fail_reason": "Archivo duplicado - ya procesado en la última hora",
                "duplicate_log_id": str(duplicate["_id"]),
                "duplicate_timestamp": duplicate.get("createdAt"),
                "inicio_procesamiento": inicio_procesamiento,
                "fin_procesamiento": fin_procesamiento,
                "duracion_ms": int((fin_procesamiento - inicio_procesamiento).total_seconds() * 1000),
                "total_registros": 0,
                "registros_procesados": 0,
                "registros_error": 1,
                "errores": [{"linea": 0, "contenido": "", "motivo": "Archivo duplicado - ya procesado en la última hora"}],
                "estado": "fallido",
                "ip_origen": request.client.host if request.client else None,
                "createdAt": now_ve()
            })

            raise HTTPException(
                status_code=409,
                detail={
                    "success": False,
                    "error": "Este archivo ya fue procesado en la última hora. Verifique si es un duplicado.",
                    "log_id": str(duplicate["_id"]),
                    "duplicate_log_id": str(duplicate_log.inserted_id)
                }
            )
        
        # Parsear archivo
        result = parse_inventory_file(content)
        products = result["products"]
        errors = result["errors"]
        
        # Preparar operaciones de bulk write
        operations = [
            UpdateOne(
                {"sku": product.sku},
                {"$set": product.dict()},
                upsert=True
            )
            for product in products
        ]
        
        # Ejecutar bulk write
        bulk_result = await db.products.bulk_write(operations, ordered=False) if operations else None
        
        procesados = 0
        if bulk_result:
            procesados = (
                bulk_result.upserted_count +
                bulk_result.modified_count +
                bulk_result.matched_count
            )
        
        fin_procesamiento = now_ve()
        duracion_ms = int((fin_procesamiento - inicio_procesamiento).total_seconds() * 1000)
        estado = "exitoso" if len(errors) == 0 else ("parcial" if procesados > 0 else "fallido")
        
        # SINCRONIZAR CON VECXEL API
        # Notificar a Vecxel API para que guarde copia en vecxel_app_db
        print(f"[SAC Connector FastAPI] Procesados: {procesados}, VECXEL_API_URL: {settings.VECXEL_API_URL}")
        if procesados > 0 and settings.VECXEL_API_URL:
            try:
                print(f"[SAC Connector FastAPI] Sincronizando {procesados} productos con Vecxel API...")

                # Convertir datetime a string para JSON serialization
                productos_json = []
                for p in products:
                    p_dict = p.dict()
                    if p_dict.get('ultima_sincronizacion'):
                        p_dict['ultima_sincronizacion'] = p_dict['ultima_sincronizacion'].isoformat()
                    productos_json.append(p_dict)

                async with httpx.AsyncClient(timeout=30.0) as client:
                    sync_response = await client.post(
                        f"{settings.VECXEL_API_URL}/inventario/sync",
                        json={
                            "productos": productos_json,
                            "origen": "sac",
                            "timestamp": ve_iso(fin_procesamiento)
                        },
                        headers={
                            "X-API-Key": settings.VECXEL_API_KEY,
                            "Content-Type": "application/json"
                        }
                    )
                    
                    if sync_response.status_code == 200:
                        sync_data = sync_response.json()
                        print(f"[SAC Connector FastAPI] [OK] Sync exitoso: {sync_data.get('synced', 0)} productos sincronizados con Vecxel API")
                    else:
                        print(f"[SAC Connector FastAPI] [WARN] Sync falló con código {sync_response.status_code}")

            except Exception as sync_error:
                print(f"[SAC Connector FastAPI] [ERROR] Sincronizando con Vecxel API: {str(sync_error)}")
                # No fallar la operación si la sincronización con Vecxel falla
                # Los datos ya están guardados en SAC Connector
        
        # Guardar archivo procesado
        storage_path = STORAGE_DIR / f"{ve_filename_timestamp()}_{file.filename}"
        with open(storage_path, "wb") as f:
            f.write(file_content)
        
        # Guardar log de sincronización
        log_doc = {
            "tipo": "upload",
            "entidad": "inventario",
            "archivo": file.filename,
            "archivo_path": str(storage_path),
            "checksum": checksum,
            "inicio_procesamiento": inicio_procesamiento,
            "fin_procesamiento": fin_procesamiento,
            "duracion_ms": duracion_ms,
            "total_registros": len(products) + len(errors),
            "registros_procesados": procesados,
            "registros_error": len(errors),
            "errores": [e.dict() for e in errors[:50]],  # Limitar a 50 errores
            "estado": estado,
            "ip_origen": request.client.host if request.client else None,
            "createdAt": now_ve()
        }
        
        log_result = await db.synclogs.insert_one(log_doc)
        
        return {
            "success": True,
            "mensaje": f"Inventario sincronizado: {procesados} productos procesados.",
            "total_registros": len(products) + len(errors),
            "registros_procesados": procesados,
            "registros_error": len(errors),
            "errores": [e.dict() for e in errors[:10]] if errors else None,  # Mostrar max 10 errores
            "duracion_ms": duracion_ms,
            "estado": estado,
            "log_id": str(log_result.inserted_id),
            "timestamp": ve_iso(fin_procesamiento)
        }
        
    except HTTPException:
        raise
    except Exception as error:
        fin_procesamiento = now_ve()
        failed_storage_path = FAILED_DIR / f"{ve_filename_timestamp()}_{file.filename}"
        with open(failed_storage_path, "wb") as failed_file:
            failed_file.write(file_content)
        
        await db.synclogs.insert_one({
            "tipo": "upload",
            "entidad": "inventario",
            "archivo": file.filename,
            "archivo_path": str(failed_storage_path),
            "fail_reason": str(error),
            "inicio_procesamiento": inicio_procesamiento,
            "fin_procesamiento": fin_procesamiento,
            "duracion_ms": int((fin_procesamiento - inicio_procesamiento).total_seconds() * 1000),
            "total_registros": 0,
            "registros_procesados": 0,
            "registros_error": 1,
            "errores": [{"linea": 0, "contenido": "", "motivo": str(error)}],
            "estado": "fallido",
            "ip_origen": request.client.host if request.client else None,
            "createdAt": now_ve()
        })
        
        raise HTTPException(status_code=422, detail={"success": False, "error": str(error)})


@router.get("/logs")
async def get_sync_logs(
    page: int = 1,
    limit: int = 20,
    entidad: str = None,
    estado: str = None,
    _: str = Depends(verify_api_key)
):
    """
    Obtener logs de sincronización
    
    Query params:
    - page: Número de página (default: 1)
    - limit: Resultados por página (default: 20)
    - entidad: Filtrar por entidad (inventario, clientes, etc.)
    - estado: Filtrar por estado (exitoso, parcial, fallido)
    """
    db = get_db()
    
    # Construir filtro
    filter_query = {}
    if entidad:
        filter_query["entidad"] = entidad
    if estado:
        filter_query["estado"] = estado
    
    # Calcular skip
    skip = (page - 1) * limit
    
    # Obtener total y logs
    total = await db.synclogs.count_documents(filter_query)
    
    cursor = db.synclogs.find(filter_query).sort("createdAt", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    # Convertir ObjectId a string
    for log in logs:
        log["_id"] = str(log["_id"])
    
    return {
        "success": True,
        "total": total,
        "pagina": page,
        "logs": logs
    }


@router.get("/logs/{log_id}/download")
async def download_inventory_file(
    log_id: str,
    _: str = Depends(verify_api_key)
):
    """
    Descargar archivo procesado asociado a un log
    """
    from bson import ObjectId
    db = get_db()
    
    try:
        log = await db.synclogs.find_one({"_id": ObjectId(log_id)}, {"archivo": 1, "archivo_path": 1})
    except:
        raise HTTPException(status_code=404, detail="Log no encontrado")
    
    if not log or not log.get("archivo_path"):
        raise HTTPException(status_code=404, detail="Archivo no disponible para este log.")
    
    archivo_path = Path(log["archivo_path"])
    
    if not archivo_path.exists():
        raise HTTPException(status_code=404, detail="El archivo fue eliminado del servidor.")
    
    return FileResponse(
        path=archivo_path,
        filename=log.get("archivo", "inventario.txt"),
        media_type="text/plain"
    )


@router.get("/inventario/{sku}")
async def get_product_by_sku(
    sku: str,
    _: str = Depends(verify_api_key)
):
    """
    Obtener detalles de un producto por SKU
    """
    db = get_db()
    
    producto = await db.products.find_one({"sku": sku})
    
    if not producto:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "error": f"Producto con SKU '{sku}' no encontrado"}
        )
    
    # Convertir ObjectId a string
    producto["_id"] = str(producto["_id"])
    
    return {
        "success": True,
        "producto": producto
    }


@router.delete("/inventario/reset")
async def reset_inventory(
    _: str = Depends(verify_api_key)
):
    """
    PELIGRO: Eliminar todos los productos y logs

    Esta operación es irreversible. Use solo para desarrollo/testing.
    """
    db = get_db()

    # Eliminar archivos almacenados
    for file_path in STORAGE_DIR.glob("*"):
        if file_path.is_file():
            file_path.unlink()

    # Eliminar productos
    result = await db.products.delete_many({})

    # Eliminar logs
    await db.synclogs.delete_many({})

    return {
        "success": True,
        "mensaje": f"Base de datos limpiada. {result.deleted_count} productos eliminados.",
        "eliminados": result.deleted_count
    }


# ==================== CLIENTES ====================

@router.post("/clientes")
async def upload_clientes(
    request: Request,
    file: UploadFile = File(...),
    _: str = Depends(verify_api_key)
):
    """
    Subir y procesar archivo de clientes SAC (CLIENTES.txt)

    Formato: campos fijos con padding de espacios, separados por ;
    RIF(10);Nombre(50);Dirección(160);Teléfonos(60);Email(40);
    CodVendedor(10);CodZona(10);EsquemaPago(10);

    Implementa validación robusta en 5 capas:
    1. Validación de archivo (encoding, tamaño)
    2. Validación de estructura
    3. Validación de formato SAC
    4. Validación de reglas de negocio
    5. Validación de integridad
    """
    inicio = now_ve()
    db = get_db()

    if not file:
        raise HTTPException(status_code=400, detail="No se recibió ningún archivo.")

    file_content = await file.read()

    try:
        # VALIDACIÓN ROBUSTA - 5 CAPAS DE SEGURIDAD
        validation_report = await validate_clientes_file(file_content, file.filename)

        if not validation_report["isValid"]:
            raise HTTPException(
                status_code=422,
                detail={
                    "success": False,
                    "error": "Validación de archivo falló",
                    "reporte": validation_report
                }
            )

        # Parsear archivo con el parser existente
        try:
            content = file_content.decode('latin-1')
        except UnicodeDecodeError:
            content = file_content.decode('utf-8')

        result = parse_clientes_file(content)
        clientes = result.clientes
        errors = result.errors

        # Validar tasa de error
        if result.tasa_error > 0.1 and len(clientes) == 0:
            raise HTTPException(
                status_code=422,
                detail={
                    "success": False,
                    "error": f"Demasiados errores ({len(errors)}/{result.total_lineas} líneas). Archivo rechazado.",
                    "errores": [e.dict() for e in errors[:10]]
                }
            )

        # Preparar operaciones de bulk write
        operations = [
            UpdateOne(
                {"rif": c["rif"]},
                {"$set": {**c, "ultima_sincronizacion": now_ve()}},
                upsert=True
            )
            for c in clientes
        ]

        # Ejecutar bulk write
        bulk_result = await db.clients.bulk_write(operations, ordered=False) if operations else None

        procesados = 0
        if bulk_result:
            procesados = (
                bulk_result.upserted_count +
                bulk_result.modified_count +
                bulk_result.matched_count
            )

        duracion_ms = int((now_ve() - inicio).total_seconds() * 1000)
        estado = "exitoso" if len(errors) == 0 else ("parcial" if procesados > 0 else "fallido")

        # SINCRONIZAR CON VECXEL API
        if procesados > 0 and settings.VECXEL_API_URL:
            try:
                print(f"[SAC Connector FastAPI] Sincronizando {procesados} clientes con Vecxel API...")

                # Convertir datetime a string para JSON serialization
                clientes_json = []
                for c in clientes:
                    c_dict = c.copy()
                    if c_dict.get('ultima_sincronizacion'):
                        c_dict['ultima_sincronizacion'] = c_dict['ultima_sincronizacion'].isoformat()
                    clientes_json.append(c_dict)

                async with httpx.AsyncClient(timeout=30.0) as client:
                    sync_response = await client.post(
                        f"{settings.VECXEL_API_URL}/clientes/sync",
                        json={
                            "clientes": clientes_json,
                            "origen": "sac",
                            "timestamp": ve_iso()
                        },
                        headers={
                            "X-API-Key": settings.VECXEL_API_KEY,
                            "Content-Type": "application/json"
                        }
                    )

                    if sync_response.status_code == 200:
                        sync_data = sync_response.json()
                        print(f"[SAC Connector FastAPI] [OK] Sync exitoso: {sync_data.get('synced', 0)} clientes sincronizados")
                    else:
                        print(f"[SAC Connector FastAPI] [WARN] Sync falló con código {sync_response.status_code}")

            except Exception as sync_error:
                print(f"[SAC Connector FastAPI] [ERROR] Sincronizando con Vecxel API: {str(sync_error)}")

        # Guardar archivo procesado
        storage_path = STORAGE_DIR / f"{ve_filename_timestamp()}_{file.filename}"
        with open(storage_path, "wb") as f:
            f.write(file_content)

        # Guardar log
        await db.synclogs.insert_one({
            "tipo": "upload",
            "entidad": "clientes",
            "archivo": file.filename,
            "archivo_path": str(storage_path),
            "inicio_procesamiento": inicio,
            "fin_procesamiento": now_ve(),
            "duracion_ms": duracion_ms,
            "total_registros": result.total_lineas,
            "registros_procesados": procesados,
            "registros_error": len(errors),
            "errores": [e.dict() for e in errors[:50]],
            "estado": estado,
            "ip_origen": request.client.host if request.client else None,
            "createdAt": now_ve()
        })

        return {
            "success": True,
            "mensaje": f"Clientes sincronizados: {procesados} procesados.",
            "total_registros": result.total_lineas,
            "registros_procesados": procesados,
            "registros_error": len(errors),
            "duracion_ms": duracion_ms,
            "estado": estado
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail={"success": False, "error": str(error)})


@router.delete("/clientes/reset")
async def reset_clientes(
    _: str = Depends(verify_api_key)
):
    """
    Eliminar todos los clientes de la base de datos
    """
    try:
        db = get_database()
        result = await db.clientes.delete_many({})
        
        print(f"[SAC Connector FastAPI] [OK] Clientes eliminados: {result.deleted_count} registros")
        
        return {
            "success": True,
            "mensaje": f"Clientes eliminados: {result.deleted_count} registros",
            "eliminados": result.deleted_count
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail={"success": False, "error": str(error)})
