from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.core.exceptions import NotFoundError, AuthorizationError, DuplicateError
from app.models.user import User
from app.models.journal import TradeJournal
from app.schemas.journal import JournalCreate, JournalUpdate, JournalResponse
from app.repositories.journal_repo import JournalRepository
from app.repositories.trade_repo import TradeRepository
from app.repositories.account_repo import AccountRepository

router = APIRouter(prefix="/journal", tags=["journal"])


async def _get_owned_trade(trade_id: str, current_user: User, db: AsyncSession):
    trade_repo = TradeRepository(db)
    trade = await trade_repo.get(trade_id)
    if not trade:
        raise NotFoundError("Trade not found")

    account_repo = AccountRepository(db)
    account = await account_repo.get(trade.account_id)
    if not account or account.user_id != current_user.id:
        raise AuthorizationError("Not your trade")
    return trade


@router.post("/{trade_id}", response_model=JournalResponse)
async def create_journal_entry(
    trade_id: str,
    req: JournalCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    await _get_owned_trade(trade_id, current_user, db)

    repo = JournalRepository(db)
    if await repo.get_by_trade(trade_id):
        raise DuplicateError("Journal entry already exists for this trade — use PATCH to update it")

    entry = TradeJournal(
        trade_id=trade_id,
        user_id=current_user.id,
        notes=req.notes,
        tags=req.tags,
        rating=req.rating,
        lessons=req.lessons,
        setup_quality=req.setup_quality,
    )
    return await repo.create(entry)


@router.get("/{trade_id}", response_model=JournalResponse)
async def get_journal_entry(
    trade_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    await _get_owned_trade(trade_id, current_user, db)

    repo = JournalRepository(db)
    entry = await repo.get_by_trade(trade_id)
    if not entry:
        raise NotFoundError("No journal entry for this trade yet")
    return entry


@router.patch("/{trade_id}", response_model=JournalResponse)
async def update_journal_entry(
    trade_id: str,
    req: JournalUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    await _get_owned_trade(trade_id, current_user, db)

    repo = JournalRepository(db)
    entry = await repo.get_by_trade(trade_id)
    if not entry:
        raise NotFoundError("No journal entry for this trade yet — POST to create one")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    return await repo.update(entry)
