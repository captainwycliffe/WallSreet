"""
Helper functions to publish typed WebSocket events via Redis.
Call these from services/event handlers to broadcast to mobile clients.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.schemas.websocket import WSMessage
from app.websocket.manager import ws_manager


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def publish_poi_event(
    account_id: str,
    event_type: str,
    poi_data: Dict[str, Any],
):
    """Broadcast a POI event to all users of an account."""
    msg = WSMessage(
        type=event_type,
        data=poi_data,
        timestamp=_now(),
        account_id=account_id,
    )
    await ws_manager.publish_to_account(account_id, msg)


async def publish_trade_event(
    account_id: str,
    event_type: str,
    trade_data: Dict[str, Any],
):
    """Broadcast a trade/position event to all users of an account."""
    msg = WSMessage(
        type=event_type,
        data=trade_data,
        timestamp=_now(),
        account_id=account_id,
    )
    await ws_manager.publish_to_account(account_id, msg)


async def publish_account_event(
    account_id: str,
    account_data: Dict[str, Any],
):
    """Broadcast an account update event."""
    msg = WSMessage(
        type="ACCOUNT_UPDATED",
        data=account_data,
        timestamp=_now(),
        account_id=account_id,
    )
    await ws_manager.publish_to_account(account_id, msg)


async def publish_ea_event(
    account_id: str,
    event_type: str,
    ea_data: Dict[str, Any],
):
    """Broadcast an EA status event (EA_ONLINE / EA_OFFLINE)."""
    msg = WSMessage(
        type=event_type,
        data=ea_data,
        timestamp=_now(),
        account_id=account_id,
    )
    await ws_manager.publish_to_account(account_id, msg)


async def publish_risk_warning(
    account_id: str,
    warning_data: Dict[str, Any],
):
    """Broadcast a risk warning event."""
    msg = WSMessage(
        type="RISK_WARNING",
        data=warning_data,
        timestamp=_now(),
        account_id=account_id,
    )
    await ws_manager.publish_to_account(account_id, msg)
