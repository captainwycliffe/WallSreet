from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.core.exceptions import NotFoundError, AuthorizationError
from app.models.user import User
from app.schemas.account import AccountResponse, AccountCreate, EAResponse
from app.repositories.account_repo import AccountRepository
from app.models.account import MT5Account

router = APIRouter(prefix="/accounts", tags=["accounts"])


async def _to_response(account: MT5Account, repo: AccountRepository) -> AccountResponse:
    # The ea_registrations ORM relationship is still commented out (see
    # PROJECT_STATUS.md §3f/§5) — populate it with an explicit query instead
    # of relying on lazy-loading, which async SQLAlchemy doesn't support here
    # anyway.
    eas = await repo.get_ea_registrations(account.id)
    response = AccountResponse.model_validate(account)
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
    return [await _to_response(a, repo) for a in accounts]

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
    return await _to_response(account, repo)

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
    return await _to_response(created, repo)
