from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Any
from datetime import datetime
from app.models.event import EventType

class MT5EventPayload(BaseModel):
    model_config = ConfigDict(extra='allow')

class HeartbeatPayload(MT5EventPayload):
    balance: float
    equity: float
    margin: float
    free_margin: float
    open_pl: float

class POICreatedPayload(MT5EventPayload):
    pass

class PositionOpenedPayload(MT5EventPayload):
    pass

class PositionUpdatedPayload(MT5EventPayload):
    pass

class PositionClosedPayload(MT5EventPayload):
    pass

class EventCreate(BaseModel):
    type: EventType
    payload: dict[str, Any]
    poi_id: Optional[str] = None
    trade_id: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    account_id: str
    ea_id: Optional[str]
    poi_id: Optional[str]
    trade_id: Optional[str]
    type: EventType
    payload: dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
