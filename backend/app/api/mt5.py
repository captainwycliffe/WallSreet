from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.core.dependencies import get_ea_from_api_key, RateLimiter, get_db
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
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import update, select
    from app.models.account import MT5Account, EARegistrationStatus
    now = datetime.utcnow()

    await db.execute(
        update(EARegistration)
        .where(EARegistration.id == ea.id)
        .values(
            last_heartbeat=now,
            status=EARegistrationStatus.ONLINE,
            version=payload.version if payload.version else ea.version,
        )
    )

    # Update live account balances from MT5 terminal
    res = await db.execute(select(MT5Account).where(MT5Account.id == ea.account_id))
    acc = res.scalar_one_or_none()
    if acc:
        if payload.balance is not None and payload.balance > 0: acc.balance = payload.balance
        if payload.equity is not None and payload.equity > 0: acc.equity = payload.equity
        if payload.margin is not None: acc.margin = payload.margin
        if payload.free_margin is not None: acc.free_margin = payload.free_margin
        if payload.open_pl is not None: acc.open_pl = payload.open_pl

    # Auto-reconcile open positions with live MT5 tickets
    if payload.open_tickets is not None:
        from app.models.trade import Trade, TradeStatus
        trades_res = await db.execute(
            select(Trade).where(
                Trade.account_id == ea.account_id,
                Trade.status == TradeStatus.OPEN
            )
        )
        current_open = trades_res.scalars().all()
        for t in current_open:
            if t.mt5_ticket not in payload.open_tickets:
                t.status = TradeStatus.CLOSED
                if not t.closed_at:
                    t.closed_at = now

    await db.commit()
    return {"status": "ok"}

@router.post("/poi", response_model=POIResponse)
async def create_poi(
    req: POICreate,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    service = POIService(db)
    return await service.create_poi(ea.account_id, ea.id, req)

@router.post("/position/open", response_model=TradeResponse)
async def open_position(
    req: TradeCreate,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    service = TradeService(db)
    return await service.open_position(ea.account_id, req)

@router.post("/position/update")
async def update_position(
    ticket: int,
    req: TradeUpdate,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.trade_repo import TradeRepository
    from app.models.account import EARegistrationStatus
    
    # Touch EA heartbeat so EA remains ONLINE while active
    ea.last_heartbeat = datetime.utcnow()
    ea.status = EARegistrationStatus.ONLINE

    repo = TradeRepository(db)
    trade = await repo.get_by_ticket(ticket)
    if not trade:
        await db.commit()
        return {"status": "not_registered_yet"}

    from app.models.trade import TradeStatus
    trade.status = TradeStatus.OPEN
    if req.current_price is not None: trade.current_price = req.current_price
    if req.stop_loss is not None: trade.stop_loss = req.stop_loss
    if req.take_profit is not None: trade.take_profit = req.take_profit
    if req.profit is not None: trade.profit = req.profit
    profit_val = req.profit if req.profit is not None else req.unrealized_profit
    if profit_val is not None: trade.profit = profit_val
    await repo.update(trade)
    await db.commit()
    return {"status": "updated"}

@router.post("/position/close")
async def close_position(
    ticket: int,
    req: TradeClose,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.trade_repo import TradeRepository
    from app.models.trade import TradeStatus
    repo = TradeRepository(db)
    trade = await repo.get_by_ticket(ticket)
    if not trade:
        return {"status": "not_found"}
    if trade.status == TradeStatus.CLOSED:
        return trade
    
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
