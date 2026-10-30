from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.trade import Trade
from typing import Optional, List

class TradeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: str) -> Optional[Trade]:
        result = await self.db.execute(select(Trade).where(Trade.id == id))
        return result.scalar_one_or_none()
        
    async def get_by_ticket(self, ticket: int) -> Optional[Trade]:
        result = await self.db.execute(select(Trade).where(Trade.mt5_ticket == ticket))
        return result.scalar_one_or_none()

    async def get_by_idempotency_key(self, key: str) -> Optional[Trade]:
        result = await self.db.execute(select(Trade).where(Trade.idempotency_key == key))
        return result.scalar_one_or_none()

    async def create(self, trade: Trade) -> Trade:
        self.db.add(trade)
        await self.db.commit()
        await self.db.refresh(trade)
        return trade
        
    async def update(self, trade: Trade) -> Trade:
        await self.db.commit()
        await self.db.refresh(trade)
        return trade
        
    async def get_all_for_account(self, account_id: str) -> List[Trade]:
        result = await self.db.execute(select(Trade).where(Trade.account_id == account_id).order_by(Trade.opened_at.desc()))
        return list(result.scalars().all())
