from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.analytics import MetricsResponse
from app.repositories.trade_repo import TradeRepository
from app.analytics.metrics import (
    win_rate, average_win, average_loss, profit_factor, expectancy, average_r
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = TradeRepository(db)
    trades = await repo.get_all_for_account(account_id)
    
    return MetricsResponse(
        total_trades=len(trades),
        win_rate=win_rate(trades),
        average_win=average_win(trades),
        average_loss=average_loss(trades),
        profit_factor=profit_factor(trades),
        expectancy=expectancy(trades),
        average_r=average_r(trades),
        max_drawdown=0.0,
        total_net_profit=sum(t.net_profit for t in trades if t.status == "CLOSED"),
        best_trade=max([t.net_profit for t in trades if t.status == "CLOSED"], default=0.0),
        worst_trade=min([t.net_profit for t in trades if t.status == "CLOSED"], default=0.0)
    )
