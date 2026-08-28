from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.poi import POI, POIStatus
from typing import Optional, List

class POIRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: str) -> Optional[POI]:
        result = await self.db.execute(select(POI).where(POI.id == id))
        return result.scalar_one_or_none()
        
    async def get_by_idempotency_key(self, key: str) -> Optional[POI]:
        result = await self.db.execute(select(POI).where(POI.idempotency_key == key))
        return result.scalar_one_or_none()

    async def create(self, poi: POI) -> POI:
        self.db.add(poi)
        await self.db.commit()
        await self.db.refresh(poi)
        return poi
        
    async def update(self, poi: POI) -> POI:
        await self.db.commit()
        await self.db.refresh(poi)
        return poi
        
    async def get_all_for_account(self, account_id: str, skip: int = 0, limit: int = 100) -> List[POI]:
        result = await self.db.execute(
            select(POI).where(POI.account_id == account_id).offset(skip).limit(limit)
        )
        return list(result.scalars().all())
