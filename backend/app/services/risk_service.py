from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.trade_repo import TradeRepository
from app.repositories.account_repo import AccountRepository
from app.schemas.risk import RiskDashboardResponse, RiskLimits, RiskWarning
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
        open_trades = [t for t in trades if t.status == "OPEN"]
        
        open_risk_amount = sum(t.risk_amount for t in open_trades)
        equity = account.equity if account.equity > 0 else account.balance
        open_risk_pct = (open_risk_amount / equity * 100) if equity > 0 else 0
        
        warnings: List[RiskWarning] = []
        limits = RiskLimits()
        
        if open_risk_pct > limits.max_open_risk_pct:
            warnings.append(RiskWarning(
                type="OPEN_RISK",
                message=f"Open risk {open_risk_pct:.1f}% exceeds limit of {limits.max_open_risk_pct}%",
                severity="HIGH"
            ))
            
        if account.drawdown_pct > limits.max_daily_drawdown_pct:
            warnings.append(RiskWarning(
                type="DRAWDOWN",
                message=f"Drawdown {account.drawdown_pct:.1f}% exceeds daily limit of {limits.max_daily_drawdown_pct}%",
                severity="CRITICAL"
            ))

        return RiskDashboardResponse(
            account_id=account_id,
            current_drawdown_pct=float(account.drawdown_pct),
            open_risk_pct=open_risk_pct,
            daily_trades_count=len([t for t in trades if str(t.opened_at.date()) == str(account.updated_at.date())]),
            limits=limits,
            warnings=warnings,
            is_trading_allowed=len(warnings) == 0
        )
