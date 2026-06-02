from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from ..models.sync_log import SyncLogListResponse
from ..middleware.auth import verify_api_key
from ..clients.sac_connector import SACConnectorClient

router = APIRouter(prefix="/logs", tags=["Logs"])
sac_client = SACConnectorClient()

@router.get("", response_model=SyncLogListResponse)
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    entidad: Optional[str] = None,
    estado: Optional[str] = None,
    _: str = Depends(verify_api_key)
):
    try:
        data = await sac_client.get_logs(
            page=page,
            limit=limit,
            entidad=entidad,
            estado=estado
        )
        return data
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error comunicándose con SAC Connector: {str(e)}"
        )
