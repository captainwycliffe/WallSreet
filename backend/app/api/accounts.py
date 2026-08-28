from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.account import AccountResponse, AccountCreate
from app.repositories.account_repo import AccountRepository
from app.models.account import MT5Account

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("", response_model=List[AccountResponse])
async def get_accounts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = AccountRepository(db)
    return await repo.get_all_for_user(current_user.id)

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
    return await repo.create(acc)
