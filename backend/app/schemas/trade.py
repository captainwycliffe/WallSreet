from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, Union, Any
from datetime import datetime
from app.models.trade import TradeStatus, TradeDirection

def parse_mql_datetime(v: Union[datetime, str, None]) -> Optional[datetime]:
    if v is None or isinstance(v, datetime):
        return v
    try:
        clean = v.replace(".", "-")
        return datetime.fromisoformat(clean)
    except Exception:
        return datetime.utcnow()

class TradeCreate(BaseModel):
    mt5_ticket: Optional[int] = None
    ticket: Optional[int] = None
    symbol: str
    direction: TradeDirection
    volume: Optional[float] = None
    lot_size: Optional[float] = None
    entry_price: float
    stop_loss: float
    take_profit: float
    current_price: Optional[float] = None
    opened_at: Optional[Union[datetime, str]] = None
    poi_id: Optional[str] = None
    idempotency_key: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("mt5_ticket") and data.get("ticket"):
                data["mt5_ticket"] = int(data["ticket"])
            if data.get("volume") is None and data.get("lot_size") is not None:
                data["volume"] = round(float(data["lot_size"]), 4)
            elif data.get("volume") is not None:
                data["volume"] = round(float(data["volume"]), 4)
            if not data.get("idempotency_key"):
                t = data.get("mt5_ticket") or data.get("ticket") or "0"
                data["idempotency_key"] = f"pos_open_{t}"
        return data

    @field_validator("opened_at", mode="before")
    def validate_opened_at(cls, v):
        return parse_mql_datetime(v)

    @field_validator("poi_id", mode="before")
    def validate_poi_id(cls, v):
        if not v or v == "" or v == "null":
            return None
        return v

class TradeUpdate(BaseModel):
    current_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    profit: Optional[float] = None
    unrealized_profit: Optional[float] = None

class TradeClose(BaseModel):
    exit_price: float
    profit: float
    commission: float = 0.0
    swap: float = 0.0
    closed_at: Optional[Union[datetime, str]] = None
    idempotency_key: str = ""
    close_reason: Optional[str] = None
    ticket: Optional[int] = None
    symbol: Optional[str] = None
    direction: Optional[TradeDirection] = None
    volume: Optional[float] = None
    entry_price: Optional[float] = None

    @field_validator("closed_at", mode="before")
    def validate_closed_at(cls, v):
        return parse_mql_datetime(v)

class TradeResponse(BaseModel):
    id: str
    poi_id: Optional[str] = None
    account_id: str
    mt5_ticket: int
    symbol: str
    direction: TradeDirection
    volume: float
    entry_price: float
    stop_loss: float
    take_profit: float
    current_price: Optional[float] = None
    exit_price: Optional[float] = None
    profit: Optional[float] = 0.0
    commission: Optional[float] = 0.0
    swap: Optional[float] = 0.0
    net_profit: Optional[float] = 0.0
    risk_amount: Optional[float] = 0.0
    reward_amount: Optional[float] = 0.0
    r_multiple: Optional[float] = 0.0
    pips: Optional[float] = 0.0
    status: TradeStatus
    opened_at: datetime
    closed_at: Optional[datetime] = None
    created_at: datetime

    @field_validator("volume", mode="before")
    @classmethod
    def normalize_volume(cls, v: Any) -> float:
        if v is None:
            return 0.0
        return round(float(v), 4)
    
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
