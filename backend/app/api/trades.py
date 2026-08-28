from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.trade import TradeListResponse, TradeResponse
from app.repositories.trade_repo import TradeRepository

router = APIRouter(prefix="/trades", tags=["trades"])

@router.get("", response_model=TradeListResponse)
async def get_trades(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = TradeRepository(db)
    trades = await repo.get_all_for_account(account_id)
    return TradeListResponse(data=trades, total=len(trades))
