from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.trade import TradeStatus, TradeDirection

class TradeCreate(BaseModel):
    mt5_ticket: int
    symbol: str
    direction: TradeDirection
    volume: float
    entry_price: float
    stop_loss: float
    take_profit: float
    current_price: float
    opened_at: datetime
    poi_id: Optional[str] = None
    idempotency_key: str

class TradeUpdate(BaseModel):
    current_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    profit: Optional[float] = None

class TradeClose(BaseModel):
    exit_price: float
    profit: float
    commission: float
    swap: float
    closed_at: datetime
    idempotency_key: str

class TradeResponse(BaseModel):
    id: str
    poi_id: Optional[str]
    account_id: str
    mt5_ticket: int
    symbol: str
    direction: TradeDirection
    volume: float
    entry_price: float
    stop_loss: float
    take_profit: float
    current_price: float
    exit_price: Optional[float]
    profit: float
    commission: float
    swap: float
    net_profit: float
    risk_amount: float
    reward_amount: float
    r_multiple: float
    pips: float
    status: TradeStatus
    opened_at: datetime
    closed_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TradeListResponse(BaseModel):
    items: list[TradeResponse]
    total: int
    page: int
    pages: int

class TradeFilter(BaseModel):
    status: Optional[TradeStatus] = None
    symbol: Optional[str] = None
    direction: Optional[TradeDirection] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    account_id: Optional[str] = None
