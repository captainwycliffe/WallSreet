from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.poi import POIResponse, POIListResponse, POIUpdate
from app.models.poi import POIStatus, Direction
from sqlalchemy import select

router = APIRouter(prefix="/pois", tags=["pois"])

@router.get("", response_model=POIListResponse)
async def get_pois(
    account_id: str,
    status: Optional[POIStatus] = None,
    symbol: Optional[str] = None,
    direction: Optional[Direction] = None,
    timeframe: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    from app.models.poi import POI
    query = select(POI).where(POI.account_id == account_id)
    if status: query = query.where(POI.status == status)
    if symbol: query = query.where(POI.symbol == symbol)
    if direction: query = query.where(POI.direction == direction)
    if timeframe: query = query.where(POI.timeframe == timeframe)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    pois = list(result.scalars().all())
    
    count_query = select(POI.id).where(POI.account_id == account_id)
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())
    
    return POIListResponse(data=pois, total=total)

@router.get("/{id}", response_model=POIResponse)
async def get_poi(
    id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    from app.repositories.poi_repo import POIRepository
    from app.core.exceptions import NotFoundError
    repo = POIRepository(db)
    poi = await repo.get(id)
    if not poi: raise NotFoundError()
    return poi

@router.patch("/{id}", response_model=POIResponse)
async def update_poi(
    id: str,
    req: POIUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    from app.services.poi_service import POIService
    service = POIService(db)
    return await service.update_poi_status(id, req.status)
