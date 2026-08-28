"""WebSocket router — authenticates and manages client connections."""
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_token
from app.db.session import AsyncSessionLocal
from app.models.account import MT5Account
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

ws_router = APIRouter(tags=["websocket"])


@ws_router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time updates.
    
    Connect with: ws://host/ws/{user_id}?token=JWT_ACCESS_TOKEN
    
    The server sends WSMessage objects as JSON strings.
    Message types: POI_CREATED, POI_UPDATED, POSITION_OPENED,
                   POSITION_UPDATED, POSITION_CLOSED, SL_HIT, TP_HIT,
                   EA_ONLINE, EA_OFFLINE, ACCOUNT_UPDATED, PING
    """
    # Authenticate
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    payload = verify_token(token)
    if not payload or payload.get("sub") != user_id:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return

    # Get user's account IDs for routing
    account_ids = []
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(MT5Account.id).where(MT5Account.user_id == user_id)
            )
            account_ids = [str(row[0]) for row in result.fetchall()]
    except Exception as e:
        logger.error("Error fetching accounts for user %s: %s", user_id, e)

    # Connect
    await ws_manager.connect(user_id, websocket, account_ids)

    try:
        # Keep connection alive — handle ping/pong
        while True:
            try:
                data = await websocket.receive_text()
                if data == '{"type":"PING"}':
                    await websocket.send_text('{"type":"PONG"}')
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.debug("WS receive error for user %s: %s", user_id, e)
                break
    finally:
        await ws_manager.disconnect(user_id, websocket)
        logger.info("WS session ended for user %s", user_id)
