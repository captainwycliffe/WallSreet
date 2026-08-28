from sqlalchemy.ext.asyncio import AsyncSession
from app.models.trade import Trade, TradeStatus, TradeDirection
from app.schemas.trade import TradeCreate, TradeUpdate, TradeClose
from app.repositories.trade_repo import TradeRepository
from app.events.bus import event_bus
from app.core.exceptions import NotFoundError

class TradeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TradeRepository(db)

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
        existing = await self.repo.get_by_idempotency_key(req.idempotency_key)
        if existing:
            return existing
            
        trade = Trade(
            account_id=account_id,
            poi_id=req.poi_id,
            mt5_ticket=req.mt5_ticket,
            symbol=req.symbol,
            direction=req.direction,
            volume=req.volume,
            entry_price=req.entry_price,
            stop_loss=req.stop_loss,
            take_profit=req.take_profit,
            current_price=req.current_price,
            opened_at=req.opened_at,
            status=TradeStatus.OPEN,
            idempotency_key=req.idempotency_key
        )
        trade = await self.repo.create(trade)
        
        await event_bus.emit("POSITION_OPENED", {
            "account_id": account_id,
            "trade_id": trade.id,
            "ticket": trade.mt5_ticket
        })
        
        return trade
