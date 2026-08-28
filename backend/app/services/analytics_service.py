from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.trade_repo import TradeRepository
from app.schemas.analytics import AnalyticsFilter, MetricsResponse, AnalyticsResponse
from app.analytics.metrics import (
    win_rate, average_win, average_loss, profit_factor, expectancy, average_r, max_drawdown
)
from app.analytics.equity import build_equity_curve, build_daily_pl
from typing import Dict, Any

class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.trade_repo = TradeRepository(db)

    async def get_metrics(self, account_id: str, filters: AnalyticsFilter) -> MetricsResponse:
        trades = await self.trade_repo.get_all_for_account(account_id)
        if filters.symbol:
            trades = [t for t in trades if t.symbol == filters.symbol]
            
        closed = [t for t in trades if t.status == "CLOSED"]
        eq_curve = build_equity_curve(closed, 100000.0) # Demo baseline
        eq_values = [p.equity for p in eq_curve]
        
        return MetricsResponse(
            total_trades=len(trades),
            win_rate=win_rate(trades),
            average_win=average_win(trades),
            average_loss=average_loss(trades),
            profit_factor=profit_factor(trades),
            expectancy=expectancy(trades),
            average_r=average_r(trades),
            max_drawdown=max_drawdown(eq_values),
            total_net_profit=sum(t.net_profit for t in closed),
            best_trade=max([t.net_profit for t in closed], default=0.0),
            worst_trade=min([t.net_profit for t in closed], default=0.0)
        )

    async def get_equity_curve(self, account_id: str, starting_balance: float = 100000.0) -> list:
        trades = await self.trade_repo.get_all_for_account(account_id)
        return build_equity_curve(trades, starting_balance)

    async def get_daily_pl(self, account_id: str) -> list:
        trades = await self.trade_repo.get_all_for_account(account_id)
        return build_daily_pl(trades)

    async def get_r_distribution(self, account_id: str) -> dict:
        trades = await self.trade_repo.get_all_for_account(account_id)
        closed = [t for t in trades if t.status == "CLOSED"]
        dist = {"0-1": 0, "1-2": 0, "2-3": 0, "3+": 0, "<0": 0}
        for t in closed:
            r = t.r_multiple
            if r < 0: dist["<0"] += 1
            elif r < 1: dist["0-1"] += 1
            elif r < 2: dist["1-2"] += 1
            elif r < 3: dist["2-3"] += 1
            else: dist["3+"] += 1
        return dist

    async def get_win_loss_distribution(self, account_id: str) -> dict:
        trades = await self.trade_repo.get_all_for_account(account_id)
        closed = [t for t in trades if t.status == "CLOSED"]
        wins = sum(1 for t in closed if t.net_profit > 0)
        losses = sum(1 for t in closed if t.net_profit <= 0)
        return {"wins": wins, "losses": losses}
