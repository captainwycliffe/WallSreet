from pydantic import BaseModel
from typing import List, Optional

class RiskLimits(BaseModel):
    max_daily_drawdown_pct: float = 5.0
    max_open_risk_pct: float = 2.0
    max_trades_per_day: int = 5

class RiskWarning(BaseModel):
    type: str
    message: str
    severity: str

class RiskDashboardResponse(BaseModel):
    account_id: str
    current_drawdown_pct: float
    open_risk_pct: float
    daily_trades_count: int
    limits: RiskLimits
    warnings: List[RiskWarning]
    is_trading_allowed: bool
