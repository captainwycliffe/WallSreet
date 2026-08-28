from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.core.dependencies import get_ea_from_api_key, RateLimiter
from app.models.account import EARegistration
from app.schemas.poi import POICreate, POIResponse, POIUpdate
from app.schemas.trade import TradeCreate, TradeResponse, TradeUpdate, TradeClose
from app.schemas.event import HeartbeatPayload
from app.services.poi_service import POIService
from app.services.trade_service import TradeService
from datetime import datetime

router = APIRouter(prefix="/mt5", tags=["mt5"])
limiter = RateLimiter(requests=120, window=60)

@router.post("/heartbeat")
async def heartbeat(
    payload: HeartbeatPayload,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_session)
):
    ea.last_heartbeat = datetime.utcnow()
    ea.status = "ONLINE"
    await db.commit()
    return {"status": "ok"}

@router.post("/poi", response_model=POIResponse)
async def create_poi(
    req: POICreate,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_session),
    _: None = Depends(limiter)
):
    service = POIService(db)
    return await service.create_poi(ea.account_id, ea.id, req)

@router.post("/position/open", response_model=TradeResponse)
async def open_position(
    req: TradeCreate,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_session),
    _: None = Depends(limiter)
):
    service = TradeService(db)
    return await service.open_position(ea.account_id, req)

@router.post("/position/update")
async def update_position(
    ticket: int,
    req: TradeUpdate,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_session)
):
    service = TradeService(db)
    # mock update logic inline
    from app.repositories.trade_repo import TradeRepository
    from app.core.exceptions import NotFoundError
    repo = TradeRepository(db)
    trade = await repo.get_by_ticket(ticket)
    if not trade: raise NotFoundError()
    if req.current_price: trade.current_price = req.current_price
    if req.stop_loss: trade.stop_loss = req.stop_loss
    if req.take_profit: trade.take_profit = req.take_profit
    await repo.update(trade)
    return {"status": "updated"}

@router.post("/position/close")
async def close_position(
    ticket: int,
    req: TradeClose,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_session)
):
    from app.repositories.trade_repo import TradeRepository
    from app.core.exceptions import NotFoundError
    from app.models.trade import TradeStatus
    repo = TradeRepository(db)
    trade = await repo.get_by_ticket(ticket)
    if not trade: raise NotFoundError()
    if trade.status == TradeStatus.CLOSED: return trade
    
    trade.exit_price = req.exit_price
    trade.profit = req.profit
    trade.commission = req.commission
    trade.swap = req.swap
    trade.net_profit = req.profit + req.commission + req.swap
    trade.closed_at = req.closed_at
    trade.status = TradeStatus.CLOSED
    await repo.update(trade)
    return trade

@router.get("/config")
async def get_config(ea: EARegistration = Depends(get_ea_from_api_key)):
    return {"enabled": True, "risk_pct": 1.0}
