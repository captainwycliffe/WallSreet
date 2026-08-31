from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_session
from app.core.dependencies import get_current_active_user, resolve_account_id
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.trade import TradeListResponse, TradeResponse
from app.repositories.trade_repo import TradeRepository

router = APIRouter(prefix="/trades", tags=["trades"])

@router.get("", response_model=TradeListResponse)
async def get_trades(
    account_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = TradeRepository(db)
    account_id = await resolve_account_id(account_id, current_user, db)
    trades = await repo.get_all_for_account(account_id)
    return TradeListResponse(items=trades, total=len(trades), page=1, pages=1)

@router.get("/{id}", response_model=TradeResponse)
async def get_trade(
    id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = TradeRepository(db)
    trade = await repo.get(id)
    if not trade:
        raise NotFoundError("Trade not found")
    return trade
