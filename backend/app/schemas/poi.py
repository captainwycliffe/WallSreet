from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Any
from datetime import datetime
from app.models.poi import POIStatus, Direction

class POICreate(BaseModel):
    symbol: str
    timeframe: str
    direction: Direction
    poi_type: str
    entry_price: float
    stop_loss: float
    take_profit: float
    zone_high: float
    zone_low: float
    risk_reward: float
    idempotency_key: str
    metadata_data: Optional[dict[str, Any]] = None

class POIUpdate(BaseModel):
    status: Optional[POIStatus] = None
    metadata_data: Optional[dict[str, Any]] = None

class POIResponse(BaseModel):
    id: str
    account_id: str
    ea_id: str
    symbol: str
    timeframe: str
    direction: Direction
    poi_type: str
    entry_price: float
    stop_loss: float
    take_profit: float
    zone_high: float
    zone_low: float
    risk_reward: float
    status: POIStatus
    activated_at: Optional[datetime]
    closed_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class POIListResponse(BaseModel):
    data: list[POIResponse]
    total: int

class POIFilter(BaseModel):
    status: Optional[POIStatus] = None
    symbol: Optional[str] = None
    direction: Optional[Direction] = None
    timeframe: Optional[str] = None
    account_id: Optional[str] = None
