from pydantic import BaseModel, Field
from typing import List, Optional
from app.core.config import settings


class RiskLimits(BaseModel):
    """Configured thresholds — field names match mobile's RiskLimits type."""
    daily_risk_limit_pct: float = Field(default_factory=lambda: settings.DEFAULT_DAILY_RISK_LIMIT_PCT)
    max_drawdown_pct: float = Field(default_factory=lambda: settings.DEFAULT_MAX_DRAWDOWN_PCT)
    risk_per_trade_pct: float = Field(default_factory=lambda: settings.DEFAULT_RISK_PER_TRADE_PCT)


class RiskWarning(BaseModel):
    type: str
    message: str
    # LOW | MEDIUM | HIGH | CRITICAL — mobile's RiskWarning severity union
    # must include CRITICAL too, since risk_service emits it for drawdown
    # breaches (see PROJECT_STATUS.md §3d).
    severity: str


class RiskDashboardResponse(BaseModel):
    """
    Field names match mobile's RiskDashboard type (types/risk.ts) directly —
    this used to be a completely different shape (current_drawdown_pct,
    daily_trades_count, is_trading_allowed) with almost nothing in common.
    """
    account_id: str
    open_risk_pct: float
    daily_risk_pct: float
    daily_pl: float
    daily_drawdown_pct: float
    max_drawdown_pct: float
    total_exposure_pct: float
    risk_per_trade_pct: float
    warnings: List[RiskWarning]
    limits: RiskLimits
