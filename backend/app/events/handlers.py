from typing import Any
import logging
from app.events.bus import event_bus
from app.websocket.events import publish_poi_event, publish_trade_event, publish_account_event, publish_ea_event

logger = logging.getLogger(__name__)

async def handle_poi_created(payload: Any):
    logger.info(f"Handling POI created event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_poi_event(payload["account_id"], "POI_CREATED", payload)

async def handle_trade_opened(payload: Any):
    logger.info(f"Handling Trade opened event: {payload}")
    if isinstance(payload, dict) and "account_id" in payload:
        await publish_trade_event(payload["account_id"], "POSITION_OPENED", payload)

def register_handlers():
    event_bus.subscribe("POI_CREATED", handle_poi_created)
    event_bus.subscribe("POSITION_OPENED", handle_trade_opened)
