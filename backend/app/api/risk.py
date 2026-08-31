from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.core.dependencies import get_current_active_user, resolve_account_id
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.risk import RiskDashboardResponse
from app.services.risk_service import RiskService

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/dashboard", response_model=RiskDashboardResponse)
async def get_risk_dashboard(
    account_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    account_id = await resolve_account_id(account_id, current_user, db)
    service = RiskService(db)
    try:
        return await service.get_risk_dashboard(account_id)
    except ValueError as e:
        raise NotFoundError(str(e))
