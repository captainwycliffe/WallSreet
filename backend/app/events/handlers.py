from typing import Any
import logging
from app.events.bus import event_bus
from app.websocket.events import publish_poi_event, publish_trade_event, publish_account_event, publish_ea_event

logger = logging.getLogger(__name__)

async def handle_poi_created(payload: Any):
    logger.debug(f"Handling POI created event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_poi_event(str(payload["account_id"]), "POI_CREATED", payload)

async def handle_poi_updated(payload: Any):
    logger.debug(f"Handling POI updated event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_poi_event(str(payload["account_id"]), "POI_UPDATED", payload)

async def handle_poi_expired(payload: Any):
    logger.debug(f"Handling POI expired event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_poi_event(str(payload["account_id"]), "POI_EXPIRED", payload)

async def handle_trade_opened(payload: Any):
    logger.debug(f"Handling Trade opened event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_trade_event(str(payload["account_id"]), "POSITION_OPENED", payload)

async def handle_trade_updated(payload: Any):
    logger.debug(f"Handling Trade updated event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_trade_event(str(payload["account_id"]), "POSITION_UPDATED", payload)

async def handle_trade_closed(payload: Any):
    logger.debug(f"Handling Trade closed event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_trade_event(str(payload["account_id"]), "POSITION_CLOSED", payload)

async def handle_account_updated(payload: Any):
    logger.debug(f"Handling Account updated event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_account_event(str(payload["account_id"]), payload)

def register_handlers():
    event_bus.subscribe("POI_CREATED", handle_poi_created)
    event_bus.subscribe("POI_UPDATED", handle_poi_updated)
    event_bus.subscribe("POI_EXPIRED", handle_poi_expired)
    event_bus.subscribe("POSITION_OPENED", handle_trade_opened)
    event_bus.subscribe("POSITION_UPDATED", handle_trade_updated)
    event_bus.subscribe("POSITION_CLOSED", handle_trade_closed)
    event_bus.subscribe("ACCOUNT_UPDATED", handle_account_updated)
