from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select
from app.db.session import get_session
from app.core.dependencies import get_ea_from_api_key, RateLimiter, get_db
from app.models.account import EARegistration, MT5Account, EARegistrationStatus
from app.models.poi import POI, POIStatus
from app.models.trade import Trade, TradeStatus
from app.schemas.poi import POICreate, POIResponse, POIUpdate
from app.schemas.trade import TradeCreate, TradeResponse, TradeUpdate, TradeClose
from app.schemas.event import HeartbeatPayload
from app.services.poi_service import POIService
from app.services.trade_service import TradeService
from app.services.notification_service import NotificationService
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mt5", tags=["mt5"])
limiter = RateLimiter(requests=120, window=60)

class NearEntryAlertRequest(BaseModel):
    ticket: int
    symbol: str
    direction: str
    entry_price: float
    current_price: float
    distance: float

@router.post("/heartbeat")
async def heartbeat(
    payload: HeartbeatPayload,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_db)
):
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

    # 1. Auto-reconcile open positions with live MT5 tickets
    if payload.open_tickets is not None:
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

    # 2. Auto-reconcile pending orders (remove expired/cancelled orders)
    if payload.pending_tickets is not None:
        pois_res = await db.execute(
            select(POI).where(
                POI.account_id == ea.account_id,
                POI.status == POIStatus.PENDING
            )
        )
        current_pending = pois_res.scalars().all()
        for p in current_pending:
            order_ticket = None
            if p.metadata_data and isinstance(p.metadata_data, dict):
                order_ticket = p.metadata_data.get("mt5_order_ticket")
            elif p.idempotency_key and p.idempotency_key.startswith("order_poi_"):
                try:
                    order_ticket = int(p.idempotency_key.replace("order_poi_", ""))
                except Exception:
                    pass

            # If order ticket was tracked and is no longer pending in MT5, mark EXPIRED
            if order_ticket and order_ticket not in payload.pending_tickets:
                p.status = POIStatus.EXPIRED
                if not p.closed_at:
                    p.closed_at = now

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

@router.post("/order/delete")
async def delete_order(
    ticket: int,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Mark a cancelled or expired pending order as EXPIRED."""
    idem_key = f"order_poi_{ticket}"
    res = await db.execute(
        select(POI).where(
            POI.account_id == ea.account_id,
            POI.status == POIStatus.PENDING
        )
    )
    pois = res.scalars().all()
    count = 0
    now = datetime.utcnow()
    for p in pois:
        meta_ticket = None
        if p.metadata_data and isinstance(p.metadata_data, dict):
            meta_ticket = p.metadata_data.get("mt5_order_ticket")
        if p.idempotency_key == idem_key or meta_ticket == ticket:
            p.status = POIStatus.EXPIRED
            p.closed_at = now
            count += 1

    await db.commit()
    return {"status": "expired", "ticket": ticket, "count": count}

@router.post("/alert/near-entry")
async def alert_near_entry(
    req: NearEntryAlertRequest,
    ea: EARegistration = Depends(get_ea_from_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Send near-entry notification when current price approaches entry."""
    acc_res = await db.execute(select(MT5Account).where(MT5Account.id == ea.account_id))
    acc = acc_res.scalar_one_or_none()
    if acc:
        notif_service = NotificationService(db)
        curr_str = f"{req.current_price:.2f}" if req.current_price > 100 else f"{req.current_price:.5f}"
        entry_str = f"{req.entry_price:.2f}" if req.entry_price > 100 else f"{req.entry_price:.5f}"
        title = "⚠️ Price Alert: Near Entry"
        body = f"{req.symbol} is near your {req.direction} entry! Current: {curr_str} (Entry: {entry_str})"
        await notif_service.send_to_user(
            user_id=acc.user_id,
            notif_type="PRICE_NEAR_ENTRY",
            title=title,
            body=body,
            data={"ticket": req.ticket, "symbol": req.symbol, "current_price": req.current_price, "entry_price": req.entry_price}
        )
    return {"status": "alert_sent"}

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
    
    # Touch EA heartbeat so EA remains ONLINE while active
    ea.last_heartbeat = datetime.utcnow()
    ea.status = EARegistrationStatus.ONLINE

    repo = TradeRepository(db)
    trade = await repo.get_by_ticket(ticket)
    if not trade:
        trade = Trade(
            account_id=ea.account_id,
            mt5_ticket=ticket,
            symbol="MT5_TRADE",
            direction=TradeDirection.BUY,
            volume=0.01,
            entry_price=req.current_price or 0.0,
            current_price=req.current_price or 0.0,
            stop_loss=req.stop_loss or 0.0,
            take_profit=req.take_profit or 0.0,
            profit=req.profit or req.unrealized_profit or 0.0,
            status=TradeStatus.OPEN,
            opened_at=datetime.utcnow(),
            idempotency_key=f"pos_open_{ticket}"
        )
        trade = await repo.create(trade)
    else:
        trade.status = TradeStatus.OPEN
        if req.current_price is not None: trade.current_price = req.current_price
        if req.stop_loss is not None: trade.stop_loss = req.stop_loss
        if req.take_profit is not None: trade.take_profit = req.take_profit
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
    repo = TradeRepository(db)
    if not trade:
        trade = Trade(
            account_id=ea.account_id,
            mt5_ticket=ticket,
            symbol="MT5_TRADE",
            direction=TradeDirection.BUY,
            volume=0.01,
            entry_price=req.exit_price,
            exit_price=req.exit_price,
            profit=req.profit,
            commission=req.commission,
            swap=req.swap,
            net_profit=req.profit + req.commission + req.swap,
            status=TradeStatus.CLOSED,
            closed_at=req.closed_at or datetime.utcnow(),
            idempotency_key=f"pos_close_{ticket}"
        )
        trade = await repo.create(trade)
    else:
        if trade.status == TradeStatus.CLOSED:
            return trade
        trade.exit_price = req.exit_price
        trade.profit = req.profit
        trade.commission = req.commission
        trade.swap = req.swap
        trade.net_profit = req.profit + req.commission + req.swap
        trade.closed_at = req.closed_at or datetime.utcnow()
        trade.status = TradeStatus.CLOSED
        await repo.update(trade)

    await db.commit()

    # Emit event bus & WS notification
    from app.events.bus import event_bus
    await event_bus.emit("POSITION_CLOSED", {
        "account_id": ea.account_id,
        "trade_id": trade.id,
        "ticket": ticket,
        "net_profit": trade.net_profit,
    })

    try:
        from app.services.notification_service import NotificationService
        notif_service = NotificationService(db)
        acc_res = await db.execute(select(MT5Account).where(MT5Account.id == ea.account_id))
        acc = acc_res.scalar_one_or_none()
        if acc:
            p_sign = "+" if (trade.net_profit or 0) >= 0 else ""
            title = f"💰 Trade Closed ({p_sign}${trade.net_profit:.2f})"
            body = f"{trade.symbol} #{ticket} closed at {trade.exit_price:.5f} (P/L: {p_sign}${trade.net_profit:.2f})"
            await notif_service.send_to_user(
                user_id=acc.user_id,
                notif_type="TRADE_CLOSED",
                title=title,
                body=body,
                data={"ticket": ticket, "net_profit": trade.net_profit}
            )
    except Exception as e:
        logger.warning("Failed to send trade closed notification: %s", e)

    return trade

@router.get("/config")
async def get_config(ea: EARegistration = Depends(get_ea_from_api_key)):
    return {"enabled": True, "risk_pct": 1.0}
