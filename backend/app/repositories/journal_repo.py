from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.journal import TradeJournal
from typing import Optional


class JournalRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_trade(self, trade_id: str) -> Optional[TradeJournal]:
        result = await self.db.execute(
            select(TradeJournal).where(TradeJournal.trade_id == trade_id)
        )
        return result.scalar_one_or_none()

    async def create(self, journal: TradeJournal) -> TradeJournal:
        self.db.add(journal)
        await self.db.commit()
        await self.db.refresh(journal)
        return journal

    async def update(self, journal: TradeJournal) -> TradeJournal:
        await self.db.commit()
        await self.db.refresh(journal)
        return journal
