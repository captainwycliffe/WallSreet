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
from app.websocket.manager import ws_manager
from app.schemas.websocket import WSMessage

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

NORMAL_CHANNEL_ID = "mt5_normal_v3"
NEAR_ENTRY_CHANNEL_ID = "mt5_near_entry_v3"

NORMAL_SOUND_NAME = "normal_notification.wav"
NEAR_ENTRY_SOUND_NAME = "near_entry_alert.wav"


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
        result = await self.send_to_user_with_diagnostics(
            user_id=user_id,
            notif_type=notif_type,
            title=title,
            body=body,
            data=data,
        )
        return bool(result.get("success"))

    async def send_to_user_with_diagnostics(
        self,
        user_id: str,
        notif_type: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Send a push notification to every active device registered for a
        user, broadcast over WebSocket for live in-app alerts, log the attempt,
        and return detailed delivery diagnostics.
        """
        tokens = await self.repo.get_active_tokens_for_user(user_id)
        push_success = False
        push_errors: List[str] = []

        is_near_entry = notif_type == "PRICE_NEAR_ENTRY"
        channel_id = NEAR_ENTRY_CHANNEL_ID if is_near_entry else NORMAL_CHANNEL_ID
        sound_name = NEAR_ENTRY_SOUND_NAME if is_near_entry else NORMAL_SOUND_NAME

        payload_data = {**(data or {}), "type": notif_type}

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
                    "data": payload_data,
                    "sound": sound_name,
                    "channelId": channel_id,
                    "priority": "high",
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
                if resp.status_code == 200:
                    resp_json = resp.json()
                    tickets = resp_json.get("data", [])
                    if isinstance(tickets, dict):
                        tickets = [tickets]
                    ok_count = 0
                    for ticket in tickets:
                        if ticket.get("status") == "ok":
                            ok_count += 1
                        else:
                            err_msg = f"{ticket.get('message', 'unknown_error')} ({ticket.get('details', {})})"
                            push_errors.append(err_msg)
                            logger.warning("Expo push ticket error for user %s: %s", user_id, err_msg)
                    push_success = ok_count > 0
                else:
                    err_msg = f"HTTP {resp.status_code}: {resp.text}"
                    push_errors.append(err_msg)
                    logger.warning(
                        "Expo push response for user %s: %s %s",
                        user_id,
                        resp.status_code,
                        resp.text,
                    )
            except Exception as e:
                push_errors.append(str(e))
                logger.warning("Expo push request error for user %s: %s", user_id, e)
        else:
            logger.debug("No active push tokens for user %s — logging & WS only", user_id)

        # Count active WebSocket connections for user
        ws_connections = len(ws_manager._connections.get(user_id, []))
        overall_success = push_success or (ws_connections > 0)

        # Log notification in database
        log_id: Optional[str] = None
        try:
            log_entry = NotificationLog(
                user_id=user_id,
                type=notif_type,
                title=title,
                body=body,
                data=payload_data,
                sent_at=datetime.now(timezone.utc).replace(tzinfo=None),
                success=overall_success,
            )
            saved_log = await self.repo.log_notification(log_entry)
            log_id = getattr(saved_log, "id", None) or getattr(log_entry, "id", None)
        except Exception as e:
            logger.warning("Failed to save notification log: %s", e)

        # Broadcast live over WebSocket to all active connections
        try:
            ws_msg = WSMessage(
                type="NOTIFICATION",
                data={
                    "id": log_id,
                    "type": notif_type,
                    "title": title,
                    "body": body,
                    "sound": sound_name,
                    "channelId": channel_id,
                    "data": payload_data,
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
            await ws_manager.send_to_user(user_id, ws_msg)
        except Exception as e:
            logger.debug("WebSocket notification broadcast error: %s", e)

        return {
            "success": overall_success,
            "tokens_registered": len(tokens),
            "push_sent": push_success,
            "push_errors": push_errors,
            "ws_connections": ws_connections,
            "channel_id": channel_id,
            "sound": sound_name,
            "log_id": log_id,
        }
