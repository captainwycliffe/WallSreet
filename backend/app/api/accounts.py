from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone, timedelta

from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.core.exceptions import NotFoundError, AuthorizationError
from app.models.user import User
from app.models.trade import Trade, TradeStatus
from app.schemas.account import AccountResponse, AccountCreate, EAResponse
from app.repositories.account_repo import AccountRepository
from app.models.account import MT5Account

router = APIRouter(prefix="/accounts", tags=["accounts"])


async def _to_response(account: MT5Account, repo: AccountRepository, db: AsyncSession) -> AccountResponse:
    eas = await repo.get_ea_registrations(account.id)
    
    # Calculate live accurate Daily P/L and Weekly P/L
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=now.weekday())

    trades_res = await db.execute(
        select(Trade).where(
            Trade.account_id == account.id,
            Trade.status == TradeStatus.CLOSED
        )
    )
    closed_trades = trades_res.scalars().all()

    closed_daily_pl = 0.0
    closed_weekly_pl = 0.0
    for t in closed_trades:
        t_closed = t.closed_at
        if t_closed:
            if t_closed.tzinfo is None:
                t_closed = t_closed.replace(tzinfo=timezone.utc)
            val = float(t.net_profit if t.net_profit is not None else (t.profit or 0.0))
            if t_closed >= today_start:
                closed_daily_pl += val
            if t_closed >= week_start:
                closed_weekly_pl += val

    open_pl = float(account.open_pl or 0.0)
    total_daily_pl = closed_daily_pl + open_pl
    total_weekly_pl = closed_weekly_pl + open_pl

    # Update daily_pl on account in DB if different
    account.daily_pl = total_daily_pl

    response = AccountResponse.model_validate(account)
    response.daily_pl = round(total_daily_pl, 2)
    response.weekly_pl = round(total_weekly_pl, 2)
    response.ea_registrations = [
        EAResponse.model_validate(ea).model_copy(update={"api_key": None}) for ea in eas
    ]
    return response


@router.get("", response_model=List[AccountResponse])
async def get_accounts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = AccountRepository(db)
    accounts = await repo.get_all_for_user(current_user.id)
    return [await _to_response(a, repo, db) for a in accounts]

@router.get("/{id}", response_model=AccountResponse)
async def get_account(
    id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = AccountRepository(db)
    account = await repo.get(id)
    if not account:
        raise NotFoundError("Account not found")
    if account.user_id != current_user.id:
        raise AuthorizationError("Not your account")
    return await _to_response(account, repo, db)

@router.post("", response_model=AccountResponse)
async def create_account(
    req: AccountCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = AccountRepository(db)
    acc = MT5Account(
        user_id=current_user.id,
        name=req.name,
        broker=req.broker,
        account_number=req.account_number,
        currency=req.currency,
        is_demo=req.is_demo
    )
    created = await repo.create(acc)
    return await _to_response(created, repo, db)
