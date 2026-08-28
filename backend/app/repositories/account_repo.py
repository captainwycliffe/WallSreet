from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.account import MT5Account, EARegistration
from typing import Optional, List

class AccountRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, id: str) -> Optional[MT5Account]:
        result = await self.db.execute(select(MT5Account).where(MT5Account.id == id))
        return result.scalar_one_or_none()
        
    async def get_all_for_user(self, user_id: str) -> List[MT5Account]:
        result = await self.db.execute(select(MT5Account).where(MT5Account.user_id == user_id))
        return list(result.scalars().all())

    async def create(self, account: MT5Account) -> MT5Account:
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account
        
    async def update(self, account: MT5Account) -> MT5Account:
        await self.db.commit()
        await self.db.refresh(account)
        return account
        
    async def create_ea_registration(self, ea: EARegistration) -> EARegistration:
        self.db.add(ea)
        await self.db.commit()
        await self.db.refresh(ea)
        return ea
        
    async def get_ea_registrations(self, account_id: str) -> List[EARegistration]:
        result = await self.db.execute(select(EARegistration).where(EARegistration.account_id == account_id))
        return list(result.scalars().all())
