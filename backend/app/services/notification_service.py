"""
Push notification dispatch via Expo's push API.
https://docs.expo.dev/push-notifications/sending-notifications/
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.notification import NotificationLog
from app.repositories.notification_repo import NotificationRepository

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    async def send_to_user(
        self,
        user_id: str,
        notif_type: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send a push notification to every active device registered for a
        user, and log the attempt regardless of outcome. Returns True only
        if at least one device received it successfully.
        """
        tokens = await self.repo.get_active_tokens_for_user(user_id)
        success = False

        if not tokens:
            logger.debug("No active push tokens for user %s — logging only", user_id)
        elif not settings.EXPO_ACCESS_TOKEN:
            logger.warning(
                "EXPO_ACCESS_TOKEN not configured — skipping push for user %s", user_id
            )
        else:
            messages: List[Dict[str, Any]] = [
                {
                    "to": t.token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                }
                for t in tokens
            ]
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        EXPO_PUSH_URL,
                        json=messages,
                        headers={
                            "Authorization": f"Bearer {settings.EXPO_ACCESS_TOKEN}",
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                    )
                success = resp.status_code == 200
                if not success:
                    logger.error(
                        "Expo push failed for user %s: %s %s",
                        user_id,
                        resp.status_code,
                        resp.text,
                    )
            except httpx.HTTPError as e:
                logger.error("Expo push request error for user %s: %s", user_id, e)

        await self.repo.log_notification(
            NotificationLog(
                user_id=user_id,
                type=notif_type,
                title=title,
                body=body,
                data=data,
                sent_at=datetime.now(timezone.utc).replace(tzinfo=None),
                success=success,
            )
        )
        return success
