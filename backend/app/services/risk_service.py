from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.trade_repo import TradeRepository
from app.repositories.account_repo import AccountRepository
from app.schemas.risk import RiskDashboardResponse, RiskLimits, RiskWarning
from app.analytics.metrics import max_drawdown
from app.analytics.equity import build_equity_curve
from typing import List


class RiskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.trade_repo = TradeRepository(db)
        self.account_repo = AccountRepository(db)

    async def get_risk_dashboard(self, account_id: str) -> RiskDashboardResponse:
        account = await self.account_repo.get(account_id)
        if not account:
            raise ValueError("Account not found")

        trades = await self.trade_repo.get_all_for_account(account_id)
        equity = float(account.equity) if account.equity > 0 else float(account.balance)

        open_trades = [t for t in trades if t.status == "OPEN"]
        # Trade Numeric columns come back as Decimal — must cast before
        # mixing with the plain-float equity/percentage math below (see
        # analytics/metrics.py's _f() docstring for the full story; this hit
        # the same bug independently here).
        open_risk_amount = sum(float(t.risk_amount) if t.risk_amount is not None else 0.0 for t in open_trades)
        open_risk_pct = (open_risk_amount / equity * 100) if equity > 0 else 0.0

        today = datetime.now(timezone.utc).date()
        todays_trades = [t for t in trades if t.opened_at and t.opened_at.date() == today]
        daily_risk_amount = sum(float(t.risk_amount) if t.risk_amount is not None else 0.0 for t in todays_trades)
        daily_risk_pct = (daily_risk_amount / equity * 100) if equity > 0 else 0.0

        # total notional exposure of open positions, as a % of equity —
        # distinct from open_risk_pct (which is risk-to-stop, not position size)
        total_exposure_amount = sum(
            float(t.volume) * float(t.entry_price) for t in open_trades
        )
        total_exposure_pct = (total_exposure_amount / equity * 100) if equity > 0 else 0.0

        # average realized risk per open trade, as % of equity. Falls back to
        # the configured limit when there are no open trades to average.
        limits = RiskLimits()
        risk_per_trade_pct = (
            (open_risk_pct / len(open_trades)) if open_trades else limits.risk_per_trade_pct
        )

        # True intraday equity isn't snapshotted anywhere in this model, so
        # daily_drawdown_pct reuses the account's own drawdown_pct (pushed by
        # the EA via heartbeat) as the best available proxy rather than
        # reconstructing an approximate intraday curve from closed trades.
        daily_drawdown_pct = float(account.drawdown_pct)

        closed = [t for t in trades if t.status == "CLOSED"]
        starting_balance = float(account.balance) - sum(
            float(t.net_profit) if t.net_profit is not None else 0.0 for t in closed
        )
        equity_curve = build_equity_curve(trades, starting_balance)
        max_drawdown_pct = max_drawdown([p.equity for p in equity_curve])

        warnings: List[RiskWarning] = []

        if open_risk_pct > limits.risk_per_trade_pct * max(len(open_trades), 1):
            warnings.append(RiskWarning(
                type="OPEN_RISK",
                message=f"Open risk {open_risk_pct:.1f}% is above the configured per-trade limit",
                severity="HIGH"
            ))

        if daily_risk_pct > limits.daily_risk_limit_pct:
            warnings.append(RiskWarning(
                type="DAILY_RISK",
                message=f"Today's risk {daily_risk_pct:.1f}% exceeds the daily limit of {limits.daily_risk_limit_pct}%",
                severity="HIGH"
            ))

        if daily_drawdown_pct > limits.max_drawdown_pct:
            warnings.append(RiskWarning(
                type="DRAWDOWN",
                message=f"Drawdown {daily_drawdown_pct:.1f}% exceeds the max limit of {limits.max_drawdown_pct}%",
                severity="CRITICAL"
            ))

        return RiskDashboardResponse(
            account_id=account_id,
            open_risk_pct=open_risk_pct,
            daily_risk_pct=daily_risk_pct,
            daily_pl=float(account.daily_pl),
            daily_drawdown_pct=daily_drawdown_pct,
            max_drawdown_pct=max_drawdown_pct,
            total_exposure_pct=total_exposure_pct,
            risk_per_trade_pct=risk_per_trade_pct,
            warnings=warnings,
            limits=limits,
        )
