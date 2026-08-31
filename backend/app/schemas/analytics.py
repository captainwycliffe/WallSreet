from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AnalyticsFilter(BaseModel):
    account_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    symbol: Optional[str] = None

class MetricsResponse(BaseModel):
    total_trades: int
    win_rate: float
    winning_trades: int
    losing_trades: int
    average_win: float
    average_loss: float
    profit_factor: float
    expectancy: float
    average_r: float
    max_drawdown: float
    total_pl: float
    total_net_pl: float
    best_trade: float
    worst_trade: float

class EquityPoint(BaseModel):
    date: str
    equity: float
    balance: float

class DailyPLPoint(BaseModel):
    date: str
    pl: float
    cumulative: float

class AnalyticsResponse(BaseModel):
    metrics: MetricsResponse
    equity_curve: List[EquityPoint]
    daily_pl: List[DailyPLPoint]
    r_distribution: dict
    win_loss_dist: dict

class EquityCurveResponse(BaseModel):
    equity_curve: List[EquityPoint]
    daily_pl: List[DailyPLPoint]
