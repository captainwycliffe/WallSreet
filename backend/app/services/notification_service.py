"""
Push notification dispatch via Expo's push API and real-time WebSocket broadcast.
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
from app.websocket.events import publish_poi_event
from app.websocket.manager import ws_manager
from app.schemas.websocket import WSMessage

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
        user, broadcast over WebSocket for live in-app alerts, and log the attempt.
        """
        tokens = await self.repo.get_active_tokens_for_user(user_id)
        success = False

        if tokens:
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            if settings.EXPO_ACCESS_TOKEN:
                headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"

            messages: List[Dict[str, Any]] = [
                {
                    "to": t.token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default",
                    "channelId": "default",
                }
                for t in tokens
            ]
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        EXPO_PUSH_URL,
                        json=messages,
                        headers=headers,
                    )
                success = resp.status_code == 200
                if not success:
                    logger.warning(
                        "Expo push response for user %s: %s %s",
                        user_id,
                        resp.status_code,
                        resp.text,
                    )
            except Exception as e:
                logger.warning("Expo push request error for user %s: %s", user_id, e)
        else:
            logger.debug("No active push tokens for user %s — logging & WS only", user_id)

        # Log notification in database
        try:
            await self.repo.log_notification(
                NotificationLog(
                    user_id=user_id,
                    type=notif_type,
                    title=title,
                    body=body,
                    data=data,
                    sent_at=datetime.now(timezone.utc).replace(tzinfo=None),
                    success=success or (len(tokens) == 0),
                )
            )
        except Exception as e:
            logger.warning("Failed to save notification log: %s", e)

        # Broadcast live over WebSocket to all active connections
        try:
            ws_msg = WSMessage(
                type="NOTIFICATION",
                data={
                    "type": notif_type,
                    "title": title,
                    "body": body,
                    "data": data or {},
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
            await ws_manager.send_to_user(user_id, ws_msg)
        except Exception as e:
            logger.debug("WebSocket notification broadcast error: %s", e)

        return success
