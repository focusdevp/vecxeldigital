from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
import time
from datetime import datetime
from ..models.client import ClienteCreate, ClienteResponse, ClienteListResponse, ClienteSyncRequest, ClienteSyncResponse
from ..middleware.auth import verify_api_key
from ..database import get_db
from ..clients.sac_connector import SACConnectorClient

router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.post("/sync", response_model=ClienteSyncResponse)
async def sync_clientes_from_sac(
    data: ClienteSyncRequest,
    _: str = Depends(verify_api_key)
):
    """SAC Connector notifica nuevos clientes — se guardan en vecxel_app_db"""
    inicio = time.time()
    db = get_db()
    insertados = 0
    actualizados = 0
    errores = 0

    for cliente in data.clientes:
        try:
            cliente_dict = dict(cliente)
            cliente_dict['ultima_sync_sac'] = datetime.utcnow()
            cliente_dict['origen'] = data.origen
            cliente_dict['activo'] = True
            cliente_dict['updatedAt'] = datetime.utcnow()

            existe = await db.clientes.find_one({"rif": cliente_dict.get("rif")})
            if existe:
                await db.clientes.update_one({"rif": cliente_dict["rif"]}, {"$set": cliente_dict})
                actualizados += 1
            else:
                cliente_dict['createdAt'] = datetime.utcnow()
                await db.clientes.insert_one(cliente_dict)
                insertados += 1
        except Exception as e:
            print(f"[Clientes Sync] Error en RIF {cliente.get('rif')}: {e}")
            errores += 1

    duracion = int((time.time() - inicio) * 1000)
    print(f"[Clientes Sync] {insertados} insertados, {actualizados} actualizados, {errores} errores")

    return {
        "success": True,
        "synced": insertados + actualizados,
        "insertados": insertados,
        "actualizados": actualizados,
        "errores": errores,
        "duracion_ms": duracion
    }


@router.get("", response_model=ClienteListResponse)
async def get_clientes(
    rif: Optional[str] = None,
    nombre: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    _: str = Depends(verify_api_key)
):
    """Lista clientes desde vecxel_app_db"""
    db = get_db()
    filtro = {"activo": True}
    if rif:
        filtro["rif"] = {"$regex": rif, "$options": "i"}
    if nombre:
        filtro["nombre"] = {"$regex": nombre, "$options": "i"}

    total = await db.clientes.count_documents(filtro)
    skip = (page - 1) * limit
    cursor = db.clientes.find(filtro).skip(skip).limit(limit).sort("nombre", 1)
    clientes = await cursor.to_list(length=limit)

    for c in clientes:
        if '_id' in c:
            del c['_id']

    return {"success": True, "total": total, "pagina": page, "por_pagina": limit, "clientes": clientes}


@router.get("/{rif}", response_model=ClienteResponse)
async def get_cliente_by_rif(
    rif: str,
    _: str = Depends(verify_api_key)
):
    """Obtiene un cliente por RIF desde vecxel_app_db"""
    db = get_db()
    cliente = await db.clientes.find_one({"rif": rif.upper()})
    if not cliente:
        raise HTTPException(status_code=404, detail=f"Cliente {rif} no encontrado")
    del cliente['_id']
    return {"success": True, "cliente": cliente}


@router.post("", status_code=201)
async def create_cliente(
    data: ClienteCreate,
    _: str = Depends(verify_api_key)
):
    """
    Registra un nuevo cliente.
    Guarda en vecxel_app_db y envía a SAC Connector para generar TXT en outbox/.
    """
    db = get_db()
    sac = SACConnectorClient()

    cliente_dict = data.model_dump()
    cliente_dict['rif'] = cliente_dict['rif'].upper().strip()
    cliente_dict['origen'] = 'vecxel'
    cliente_dict['activo'] = True
    cliente_dict['createdAt'] = datetime.utcnow()
    cliente_dict['updatedAt'] = datetime.utcnow()

    # Guardar en vecxel_app_db
    existe = await db.clientes.find_one({"rif": cliente_dict["rif"]})
    if existe:
        await db.clientes.update_one({"rif": cliente_dict["rif"]}, {"$set": cliente_dict})
    else:
        await db.clientes.insert_one(cliente_dict)

    # Enviar a SAC Connector para que genere TXT en outbox/
    try:
        sac_payload = {k: v.isoformat() if isinstance(v, datetime) else v for k, v in cliente_dict.items() if v is not None}
        resultado = await sac.create_cliente(sac_payload)
        archivo_generado = resultado.get("archivo_generado", "N/A")
    except Exception as e:
        print(f"[Clientes] Advertencia: no se pudo notificar SAC Connector: {e}")
        archivo_generado = None

    return {
        "success": True,
        "mensaje": "Cliente registrado correctamente.",
        "rif": cliente_dict["rif"],
        "archivo_generado": archivo_generado
    }


@router.delete("/reset")
async def reset_clientes(
    _: str = Depends(verify_api_key)
):
    """
    Eliminar todos los clientes de la base de datos
    """
    db = get_db()
    result = await db.clientes.delete_many({})
    
    print(f"[Clientes] Clientes eliminados: {result.deleted_count} registros")
    
    return {
        "success": True,
        "mensaje": f"Clientes eliminados: {result.deleted_count} registros",
        "eliminados": result.deleted_count
    }
