from typing import List
from collections import defaultdict
from app.models.trade import Trade
from app.schemas.analytics import EquityPoint, DailyPLPoint

def build_equity_curve(trades: List[Trade], starting_balance: float) -> List[EquityPoint]:
    closed_trades = [t for t in trades if t.status == "CLOSED"]
    closed_trades.sort(key=lambda t: t.closed_at)

    curve = []
    current_balance = float(starting_balance)

    for t in closed_trades:
        # t.net_profit is a Decimal (Numeric column) — must be cast before
        # mixing with the plain-float running balance, or this raises
        # TypeError on the first real trade (see metrics.py's _f() docstring
        # for the full story).
        current_balance += float(t.net_profit) if t.net_profit is not None else 0.0
        # balance == equity at each historical point: this curve only walks
        # closed trades, so there's no floating P/L from still-open positions
        # to distinguish them at any past timestamp.
        curve.append(EquityPoint(
            date=t.closed_at.strftime("%Y-%m-%d"),
            equity=current_balance,
            balance=current_balance,
        ))
    return curve

def build_daily_pl(trades: List[Trade]) -> List[DailyPLPoint]:
    closed_trades = [t for t in trades if t.status == "CLOSED"]
    
    daily_pl = defaultdict(float)
    for t in closed_trades:
        if t.closed_at:
            date_str = t.closed_at.strftime("%Y-%m-%d")
            daily_pl[date_str] += float(t.net_profit) if t.net_profit is not None else 0.0
            
    sorted_dates = sorted(daily_pl.keys())
    
    result = []
    cumulative = 0.0
    for date in sorted_dates:
        pl = daily_pl[date]
        cumulative += pl
        result.append(DailyPLPoint(
            date=date,
            pl=pl,
            cumulative=cumulative
        ))
        
    return result
