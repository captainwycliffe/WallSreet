"""
Complete WebSocket Connection Manager with Redis pub/sub.
Supports multiple workers — messages are published via Redis and
forwarded to connected WebSocket clients.
"""
import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from fastapi import WebSocket
from redis.asyncio import Redis

from app.core.config import settings
from app.schemas.websocket import WSMessage

logger = logging.getLogger(__name__)

# Redis pub/sub channel prefix
ACCOUNT_CHANNEL_PREFIX = "ws:account:"
USER_CHANNEL_PREFIX = "ws:user:"
BROADCAST_CHANNEL = "ws:broadcast"


class ConnectionManager:
    """
    Manages WebSocket connections with Redis pub/sub for multi-worker support.
    
    Each user's connected WebSockets receive messages published to their
    account's Redis channel. This allows any backend worker to push events
    to any connected mobile client.
    """

    def __init__(self):
        # user_id → list of WebSocket connections
        self._connections: Dict[str, List[WebSocket]] = defaultdict(list)
        # user_id → account_id mapping (for routing)
        self._user_accounts: Dict[str, Set[str]] = defaultdict(set)
        self._redis: Optional[Redis] = None
        self._pubsub_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    # ─── Lifecycle ────────────────────────────────────────────────────────────

    async def startup(self):
        """Try to connect to Redis. Silently degrade to in-memory mode on failure."""
        try:
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
            await redis.ping()
            self._redis = redis
            self._pubsub_task = asyncio.create_task(
                self._redis_subscribe_loop(), name="ws_redis_listener"
            )
            logger.info("WebSocket manager started with Redis pub/sub (%s)", settings.REDIS_URL)
        except Exception as e:
            self._redis = None
            logger.info(
                "Redis unavailable (%s) — WebSocket manager running in in-memory mode. "
                "Real-time delivery active.", e
            )

    async def shutdown(self):
        """Stop Redis listener. Call on application shutdown."""
        if self._pubsub_task:
            self._pubsub_task.cancel()
            try:
                await self._pubsub_task
            except asyncio.CancelledError:
                pass
        if self._redis:
            await self._redis.aclose()
        logger.info("WebSocket manager shut down")

    # ─── Connection management ────────────────────────────────────────────────

    async def connect(self, user_id: str, websocket: WebSocket, account_ids: List[str]):
        """Accept a WebSocket connection for a user."""
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].append(websocket)
            for aid in account_ids:
                self._user_accounts[aid].add(user_id)
        
        count = len(self._connections[user_id])
        logger.info("WS connected: user=%s accounts=%s total_connections=%d", user_id, account_ids, count)
        
        # Send connection confirmation
        await self._send_to_websocket(websocket, WSMessage(
            type="CONNECTED",
            data={"user_id": user_id},
            timestamp=datetime.now(timezone.utc).isoformat(),
        ))

    async def disconnect(self, user_id: str, websocket: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            conns = self._connections.get(user_id, [])
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                self._connections.pop(user_id, None)
                # Clean up account → user mapping
                for aid, users in list(self._user_accounts.items()):
                    users.discard(user_id)
                    if not users:
                        self._user_accounts.pop(aid, None)
        logger.info("WS disconnected: user=%s", user_id)

    # ─── Sending messages ─────────────────────────────────────────────────────

    async def _send_to_websocket(self, ws: WebSocket, message: WSMessage) -> bool:
        """Send a message to a single WebSocket. Returns False on error."""
        try:
            await ws.send_text(message.model_dump_json())
            return True
        except Exception as e:
            logger.debug("WS send error: %s", e)
            return False

    async def send_to_user(self, user_id: str, message: WSMessage):
        """Send a message directly to a user's WebSocket connections (local worker only)."""
        connections = list(self._connections.get(user_id, []))
        failed = []
        for ws in connections:
            if not await self._send_to_websocket(ws, message):
                failed.append(ws)
        # Clean up dead connections
        for ws in failed:
            await self.disconnect(user_id, ws)

    async def publish_to_account(self, account_id: str, message: WSMessage):
        """
        Publish a message to all users of an account.
        Uses Redis when available; falls back to direct in-process delivery.
        """
        if self._redis:
            channel = f"{ACCOUNT_CHANNEL_PREFIX}{account_id}"
            try:
                await self._redis.publish(channel, message.model_dump_json())
                return
            except Exception as e:
                logger.warning("Redis publish error for account %s, falling back: %s", account_id, e)
        # In-process fallback — works on single-worker / no-Redis setups
        await self._forward_to_account_users(account_id, message)

    async def publish_to_user(self, user_id: str, message: WSMessage):
        """
        Publish a message to a specific user.
        Uses Redis when available; falls back to direct in-process delivery.
        """
        if self._redis:
            channel = f"{USER_CHANNEL_PREFIX}{user_id}"
            try:
                await self._redis.publish(channel, message.model_dump_json())
                return
            except Exception as e:
                logger.warning("Redis publish error for user %s, falling back: %s", user_id, e)
        # In-process fallback
        await self.send_to_user(user_id, message)

    # ─── Redis subscriber loop ────────────────────────────────────────────────

    async def _redis_subscribe_loop(self):
        """
        Listen to Redis pub/sub channels and forward messages to connected WebSocket clients.
        """
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = redis.pubsub()
        
        try:
            # Subscribe to all account and user channels
            await pubsub.psubscribe(
                f"{ACCOUNT_CHANNEL_PREFIX}*",
                f"{USER_CHANNEL_PREFIX}*",
                BROADCAST_CHANNEL,
            )
            logger.info("Redis pub/sub subscribed")

            async for raw_message in pubsub.listen():
                if raw_message["type"] not in ("pmessage", "message"):
                    continue

                try:
                    channel: str = raw_message.get("channel", "")
                    data: str = raw_message.get("data", "{}")
                    message = WSMessage.model_validate_json(data)

                    if channel.startswith(ACCOUNT_CHANNEL_PREFIX):
                        account_id = channel[len(ACCOUNT_CHANNEL_PREFIX):]
                        await self._forward_to_account_users(account_id, message)
                    elif channel.startswith(USER_CHANNEL_PREFIX):
                        user_id = channel[len(USER_CHANNEL_PREFIX):]
                        await self.send_to_user(user_id, message)
                    elif channel == BROADCAST_CHANNEL:
                        await self._broadcast_all(message)

                except Exception as e:
                    logger.error("Error processing Redis message: %s", e)

        except asyncio.CancelledError:
            logger.info("Redis pub/sub loop cancelled")
        except Exception as e:
            logger.error("Redis pub/sub loop error: %s", e)
        finally:
            try:
                await pubsub.punsubscribe()
                await redis.aclose()
            except Exception:
                pass

    async def _forward_to_account_users(self, account_id: str, message: WSMessage):
        """Forward a Redis message to all local WebSocket clients of an account."""
        user_ids = set(self._user_accounts.get(account_id, set()))
        for user_id in user_ids:
            await self.send_to_user(user_id, message)

    async def _broadcast_all(self, message: WSMessage):
        """Broadcast to all locally connected WebSocket clients."""
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, message)

    # ─── Stats ────────────────────────────────────────────────────────────────

    @property
    def connection_count(self) -> int:
        return sum(len(conns) for conns in self._connections.values())

    @property
    def connected_user_count(self) -> int:
        return len(self._connections)


# Singleton instance
ws_manager = ConnectionManager()
