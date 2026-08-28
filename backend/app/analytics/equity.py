from typing import List
from collections import defaultdict
from app.models.trade import Trade
from app.schemas.analytics import EquityPoint, DailyPLPoint

def build_equity_curve(trades: List[Trade], starting_balance: float) -> List[EquityPoint]:
    closed_trades = [t for t in trades if t.status == "CLOSED"]
    closed_trades.sort(key=lambda t: t.closed_at)
    
    curve = []
    current_balance = starting_balance
    
    for t in closed_trades:
        current_balance += t.net_profit
        curve.append(EquityPoint(
            timestamp=t.closed_at,
            equity=current_balance
        ))
    return curve

def build_daily_pl(trades: List[Trade]) -> List[DailyPLPoint]:
    closed_trades = [t for t in trades if t.status == "CLOSED"]
    
    daily_pl = defaultdict(float)
    for t in closed_trades:
        if t.closed_at:
            date_str = t.closed_at.strftime("%Y-%m-%d")
            daily_pl[date_str] += t.net_profit
            
    sorted_dates = sorted(daily_pl.keys())
    
    result = []
    cumulative = 0.0
    for date in sorted_dates:
        pl = daily_pl[date]
        cumulative += pl
        result.append(DailyPLPoint(
            date=date,
            pl=pl,
            cumulative_pl=cumulative
        ))
        
    return result
