from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.trade import Trade, TradeStatus, TradeDirection
from app.models.account import MT5Account
from app.models.poi import POI, POIStatus
from app.schemas.trade import TradeCreate, TradeUpdate, TradeClose
from app.repositories.trade_repo import TradeRepository
from app.services.notification_service import NotificationService
from app.events.bus import event_bus
from app.core.exceptions import NotFoundError
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TradeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TradeRepository(db)
        self.notif_service = NotificationService(db)

    def calculate_r_multiple(self, entry: float, sl: float, exit: float, direction: TradeDirection) -> float:
        if direction == TradeDirection.BUY:
            risk = entry - sl
            if risk <= 0: return 0.0
            return (exit - entry) / risk
        else:
            risk = sl - entry
            if risk <= 0: return 0.0
            return (entry - exit) / risk

    def calculate_pips(self, symbol: str, entry: float, exit: float, direction: TradeDirection) -> float:
        multiplier = 100 if "JPY" in symbol else 10000
        if direction == TradeDirection.BUY:
            return (exit - entry) * multiplier
        else:
            return (entry - exit) * multiplier

    async def open_position(self, account_id: str, req: TradeCreate) -> Trade:
        ticket_val = req.mt5_ticket or req.ticket or 0
        volume_val = req.volume if req.volume is not None else (req.lot_size if req.lot_size is not None else 0.01)
        idem_key = req.idempotency_key or f"pos_open_{ticket_val}"

        existing = await self.repo.get_by_ticket(ticket_val) or await self.repo.get_by_idempotency_key(idem_key)
        if existing:
            if existing.symbol == "MT5_TRADE" and req.symbol and req.symbol != "MT5_TRADE":
                existing.symbol = req.symbol
                existing.direction = req.direction
                existing.volume = volume_val
                existing.entry_price = req.entry_price
                if req.stop_loss is not None:
                    existing.stop_loss = req.stop_loss
                if req.take_profit is not None:
                    existing.take_profit = req.take_profit
                existing = await self.repo.update(existing)
            return existing
            
        trade = Trade(
            account_id=account_id,
            poi_id=req.poi_id if req.poi_id and len(req.poi_id) > 5 else None,
            mt5_ticket=ticket_val,
            symbol=req.symbol,
            direction=req.direction,
            volume=volume_val,
            entry_price=req.entry_price,
            stop_loss=req.stop_loss if req.stop_loss is not None else 0.0,
            take_profit=req.take_profit if req.take_profit is not None else 0.0,
            current_price=req.current_price if req.current_price is not None else req.entry_price,
            opened_at=req.opened_at or datetime.utcnow(),
            status=TradeStatus.OPEN,
            idempotency_key=idem_key
        )
        trade = await self.repo.create(trade)
        
        await event_bus.emit("POSITION_OPENED", {
            "account_id": account_id,
            "trade_id": trade.id,
            "ticket": trade.mt5_ticket
        })

        # Check if this trade activated a pending POI limit order
        try:
            acc_res = await self.db.execute(select(MT5Account).where(MT5Account.id == account_id))
            acc = acc_res.scalar_one_or_none()
            if acc:
                # Find matching pending POI for this symbol
                poi_res = await self.db.execute(
                    select(POI).where(
                        POI.account_id == account_id,
                        POI.symbol == trade.symbol,
                        POI.status == POIStatus.PENDING
                    )
                )
                pending_pois = poi_res.scalars().all()
                activated_poi = None
                for p in pending_pois:
                    p_entry = float(p.entry_price)
                    t_entry = float(trade.entry_price)
                    threshold = 1.0 if ("XAU" in trade.symbol or "GOLD" in trade.symbol) else 0.0010
                    if abs(p_entry - t_entry) <= threshold:
                        activated_poi = p
                        p.status = POIStatus.ACTIVE
                        p.activated_at = datetime.utcnow()
                        trade.poi_id = p.id
                        break

                entry_val = float(trade.entry_price)
                price_str = f"{entry_val:.2f}" if entry_val > 100 else f"{entry_val:.5f}"
                lots_str = f"{round(float(trade.volume), 4):g}"

                if activated_poi:
                    # Send limit activated notification
                    await self.notif_service.send_to_user(
                        user_id=acc.user_id,
                        notif_type="LIMIT_ACTIVATED",
                        title="⚡ Limit Order Activated",
                        body=f"{trade.symbol} limit filled at {price_str} ({lots_str} lots)",
                        data={"trade_id": trade.id, "ticket": trade.mt5_ticket, "symbol": trade.symbol}
                    )
                else:
                    # Send trade opened notification
                    await self.notif_service.send_to_user(
                        user_id=acc.user_id,
                        notif_type="TRADE_OPENED",
                        title="📈 Trade Activated",
                        body=f"{trade.symbol} {trade.direction.value} {lots_str} lots opened @ {price_str}",
                        data={"trade_id": trade.id, "ticket": trade.mt5_ticket, "symbol": trade.symbol}
                    )
        except Exception as e:
            logger.warning("Failed to send trade opened / limit activated notification: %s", e)
        
        return trade
