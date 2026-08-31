from typing import List
from app.models.trade import Trade

def _get_closed_trades(trades: List[Trade]) -> List[Trade]:
    return [t for t in trades if t.status == "CLOSED"]

def _f(value) -> float:
    """
    Trade money/ratio columns are SQLAlchemy Numeric (i.e. decimal.Decimal at
    the Python level). Decimal refuses to mix with plain float in arithmetic
    (raises TypeError), so every value pulled off a Trade for use in a float
    calculation goes through this first. This was a real, previously-hidden
    bug: every metrics function here looked correct against empty trade
    lists (the only thing tested so far) and would have thrown 500s on the
    very first account with real closed trades.
    """
    return float(value) if value is not None else 0.0

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
    return sum(_f(t.net_profit) for t in wins) / len(wins)

def average_loss(trades: List[Trade]) -> float:
    closed = _get_closed_trades(trades)
    losses = [t for t in closed if t.net_profit <= 0]
    if not losses:
        return 0.0
    return sum(_f(t.net_profit) for t in losses) / len(losses)

def profit_factor(trades: List[Trade]) -> float:
    closed = _get_closed_trades(trades)
    gross_profit = sum(_f(t.net_profit) for t in closed if t.net_profit > 0)
    gross_loss = abs(sum(_f(t.net_profit) for t in closed if t.net_profit <= 0))
    if gross_loss == 0:
        # float('inf') isn't valid JSON and breaks JSON.parse on the mobile
        # client — cap at a large-but-finite sentinel instead when there are
        # no losing trades to divide by.
        return 999.99 if gross_profit > 0 else 0.0
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
    return sum(_f(t.r_multiple) for t in closed) / len(closed)

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
