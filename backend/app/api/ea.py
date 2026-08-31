from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.core.exceptions import NotFoundError, AuthorizationError
from app.core.security import generate_api_key, hash_api_key
from app.models.user import User
from app.models.account import EARegistration
from app.schemas.account import EACreate, EAResponse
from app.repositories.account_repo import AccountRepository

router = APIRouter(prefix="/ea", tags=["ea"])


@router.get("/monitor", response_model=List[EAResponse])
async def get_ea_monitor(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    """All EA registrations across every account the current user owns."""
    repo = AccountRepository(db)
    accounts = await repo.get_all_for_user(current_user.id)

    eas: List[EARegistration] = []
    for account in accounts:
        eas.extend(await repo.get_ea_registrations(account.id))

    # api_key on the model is a one-way hash — never echo it back except
    # once, at registration time (see register_ea below).
    responses = []
    for ea in eas:
        r = EAResponse.model_validate(ea)
        r.api_key = None
        responses.append(r)
    return responses


@router.post("/register", response_model=EAResponse)
async def register_ea(
    req: EACreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = AccountRepository(db)
    account = await repo.get(req.account_id)
    if not account:
        raise NotFoundError("Account not found")
    if account.user_id != current_user.id:
        raise AuthorizationError("Not your account")

    raw_key = generate_api_key()
    ea = EARegistration(
        account_id=req.account_id,
        name=req.name,
        version=req.version,
        api_key=hash_api_key(raw_key),
    )
    created = await repo.create_ea_registration(ea)

    # The raw key is only ever available in this one response — the stored
    # value is a one-way hash, so it can't be recovered later. Attach it
    # here rather than persisting it anywhere.
    response = EAResponse.model_validate(created)
    response.api_key = raw_key
    return response


@router.delete("/{ea_id}", response_model=EAResponse)
async def revoke_ea(
    ea_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    from sqlalchemy import select
    result = await db.execute(select(EARegistration).where(EARegistration.id == ea_id))
    ea = result.scalar_one_or_none()
    if not ea:
        raise NotFoundError("EA registration not found")

    account_repo = AccountRepository(db)
    account = await account_repo.get(ea.account_id)
    if not account or account.user_id != current_user.id:
        raise AuthorizationError("Not your EA registration")

    ea.is_active = False
    await db.commit()
    await db.refresh(ea)
    response = EAResponse.model_validate(ea)
    response.api_key = None
    return response
