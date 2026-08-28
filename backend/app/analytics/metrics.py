from typing import List
from app.models.trade import Trade
from app.schemas.analytics import MetricsResponse

def _get_closed_trades(trades: List[Trade]) -> List[Trade]:
    return [t for t in trades if t.status == "CLOSED"]

def win_rate(trades: List[Trade]) -> float:
    closed = _get_closed_trades(trades)
    if not closed:
        return 0.0
    wins = len([t for t in closed if t.net_profit > 0])
    return wins / len(closed)

def average_win(trades: List[Trade]) -> float:
    closed = _get_closed_trades(trades)
    wins = [t for t in closed if t.net_profit > 0]
    if not wins:
        return 0.0
    return sum(t.net_profit for t in wins) / len(wins)

def average_loss(trades: List[Trade]) -> float:
    closed = _get_closed_trades(trades)
    losses = [t for t in closed if t.net_profit <= 0]
    if not losses:
        return 0.0
    return sum(t.net_profit for t in losses) / len(losses)

def profit_factor(trades: List[Trade]) -> float:
    closed = _get_closed_trades(trades)
    gross_profit = sum(t.net_profit for t in closed if t.net_profit > 0)
    gross_loss = abs(sum(t.net_profit for t in closed if t.net_profit <= 0))
    if gross_loss == 0:
        return float('inf') if gross_profit > 0 else 0.0
    return gross_profit / gross_loss

def expectancy(trades: List[Trade]) -> float:
    wr = win_rate(trades)
    aw = average_win(trades)
    al = abs(average_loss(trades))
    return (wr * aw) - ((1 - wr) * al)

def average_r(trades: List[Trade]) -> float:
    closed = _get_closed_trades(trades)
    if not closed:
        return 0.0
    return sum(t.r_multiple for t in closed) / len(closed)

def max_drawdown(equity_curve: List[float]) -> float:
    if not equity_curve:
        return 0.0
    peak = equity_curve[0]
    max_dd = 0.0
    for value in equity_curve:
        if value > peak:
            peak = value
        dd = (peak - value) / peak if peak > 0 else 0
        if dd > max_dd:
            max_dd = dd
    return max_dd * 100
