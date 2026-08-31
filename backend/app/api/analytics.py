from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.core.dependencies import get_current_active_user, resolve_account_id
from app.models.user import User
from app.schemas.analytics import MetricsResponse, EquityCurveResponse
from app.repositories.trade_repo import TradeRepository
from app.repositories.account_repo import AccountRepository
from app.analytics.metrics import (
    win_rate, average_win, average_loss, profit_factor, expectancy, average_r, max_drawdown
)
from app.analytics.equity import build_equity_curve, build_daily_pl

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _starting_balance(account, trades) -> float:
    closed = [t for t in trades if t.status == "CLOSED"]
    # t.net_profit is Decimal — must cast before mixing with plain float
    # (see analytics/metrics.py's _f() docstring for why).
    return (float(account.balance) if account else 0.0) - sum(
        float(t.net_profit) if t.net_profit is not None else 0.0 for t in closed
    )


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    account_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    account_id = await resolve_account_id(account_id, current_user, db)

    repo = TradeRepository(db)
    trades = await repo.get_all_for_account(account_id)
    closed = [t for t in trades if t.status == "CLOSED"]

    account_repo = AccountRepository(db)
    account = await account_repo.get(account_id)
    starting_balance = _starting_balance(account, trades)
    equity_curve = build_equity_curve(trades, starting_balance)
    dd = max_drawdown([p.equity for p in equity_curve])

    wins = [t for t in closed if t.net_profit > 0]
    losses = [t for t in closed if t.net_profit <= 0]

    return MetricsResponse(
        total_trades=len(trades),
        win_rate=win_rate(trades),
        winning_trades=len(wins),
        losing_trades=len(losses),
        average_win=average_win(trades),
        average_loss=average_loss(trades),
        profit_factor=profit_factor(trades),
        expectancy=expectancy(trades),
        average_r=average_r(trades),
        max_drawdown=dd,
        total_pl=sum(float(t.profit) if t.profit is not None else 0.0 for t in closed),
        total_net_pl=sum(float(t.net_profit) if t.net_profit is not None else 0.0 for t in closed),
        best_trade=max([float(t.net_profit) for t in closed], default=0.0),
        worst_trade=min([float(t.net_profit) for t in closed], default=0.0)
    )

@router.get("/equity-curve", response_model=EquityCurveResponse)
async def get_equity_curve(
    account_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    account_id = await resolve_account_id(account_id, current_user, db)

    account_repo = AccountRepository(db)
    account = await account_repo.get(account_id)

    trade_repo = TradeRepository(db)
    trades = await trade_repo.get_all_for_account(account_id)
    starting_balance = _starting_balance(account, trades)

    return EquityCurveResponse(
        equity_curve=build_equity_curve(trades, starting_balance),
        daily_pl=build_daily_pl(trades),
    )
