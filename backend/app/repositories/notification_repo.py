from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.notification import PushToken, NotificationLog
from typing import Optional, List


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_token(self, user_id: str, token: str) -> Optional[PushToken]:
        result = await self.db.execute(
            select(PushToken).where(
                PushToken.user_id == user_id, PushToken.token == token
            )
        )
        return result.scalar_one_or_none()

    async def get_active_tokens_for_user(self, user_id: str) -> List[PushToken]:
        result = await self.db.execute(
            select(PushToken).where(
                PushToken.user_id == user_id, PushToken.is_active == True  # noqa: E712
            )
        )
        return list(result.scalars().all())

    async def register_token(self, token: PushToken) -> PushToken:
        self.db.add(token)
        await self.db.commit()
        await self.db.refresh(token)
        return token

    async def deactivate_token(self, token_row: PushToken) -> PushToken:
        token_row.is_active = False
        await self.db.commit()
        await self.db.refresh(token_row)
        return token_row

    async def log_notification(self, log: NotificationLog) -> NotificationLog:
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def get_history_for_user(self, user_id: str, limit: int = 50) -> List[NotificationLog]:
        result = await self.db.execute(
            select(NotificationLog)
            .where(NotificationLog.user_id == user_id)
            .order_by(NotificationLog.sent_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
