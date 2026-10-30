from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.account import EARegistrationStatus

class AccountCreate(BaseModel):
    name: str
    broker: str
    account_number: str
    currency: str
    is_demo: bool = False

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class EACreate(BaseModel):
    account_id: str
    name: str
    version: str

class EAResponse(BaseModel):
    id: str
    account_id: str
    name: str
    version: str
    status: EARegistrationStatus
    last_heartbeat: Optional[datetime]
    connected_since: Optional[datetime]
    is_active: bool
    api_key: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AccountResponse(BaseModel):
    id: str
    user_id: str
    name: str
    broker: str
    account_number: str
    currency: str
    balance: float
    equity: float
    margin: float
    free_margin: float
    open_pl: float
    daily_pl: float
    weekly_pl: float = 0.0
    drawdown_pct: float
    is_active: bool
    is_demo: bool
    created_at: datetime
    ea_registrations: list[EAResponse] = []

    model_config = ConfigDict(from_attributes=True)
