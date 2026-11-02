from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.models.notification import PushToken
from app.schemas.notification import (
    PushTokenRegister,
    PushTokenResponse,
    NotificationLogResponse,
    TestNotificationRequest,
    TestNotificationResponse,
)
from app.repositories.notification_repo import NotificationRepository
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/tokens", response_model=List[PushTokenResponse])
async def get_push_tokens(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = NotificationRepository(db)
    return await repo.get_active_tokens_for_user(current_user.id)


@router.post("/test", response_model=TestNotificationResponse)
async def send_test_notification(
    req: TestNotificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    service = NotificationService(db)
    is_near_entry = req.type == "PRICE_NEAR_ENTRY"
    if is_near_entry:
        title = "⚠️ Price Alert: Near Entry (Test)"
        body = "XAUUSD.m is near your BUY_LIMIT entry! Current: 3021.40 (Entry: 3020.00)"
        notif_type = "PRICE_NEAR_ENTRY"
    else:
        title = "📈 Trade Activated (Test)"
        body = "XAUUSD.m BUY 0.2 lots opened @ 3020.00"
        notif_type = req.type or "TRADE_OPENED"

    result = await service.send_to_user_with_diagnostics(
        user_id=current_user.id,
        notif_type=notif_type,
        title=title,
        body=body,
        data={"test": True, "symbol": "XAUUSD.m"},
    )
    return result


@router.post("/token", response_model=PushTokenResponse)
async def register_push_token(
    req: PushTokenRegister,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = NotificationRepository(db)
    existing = await repo.get_token(current_user.id, req.token)
    if existing:
        if not existing.is_active:
            existing.is_active = True
            await db.commit()
            await db.refresh(existing)
        return existing

    token_row = PushToken(
        user_id=current_user.id,
        token=req.token,
        platform=req.platform,
    )
    return await repo.register_token(token_row)


@router.delete("/token/{token}", response_model=PushTokenResponse)
async def unregister_push_token(
    token: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = NotificationRepository(db)
    token_row = await repo.get_token(current_user.id, token)
    if not token_row:
        raise NotFoundError("Push token not found")
    return await repo.deactivate_token(token_row)


@router.get("/history", response_model=List[NotificationLogResponse])
async def get_notification_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_session)
):
    repo = NotificationRepository(db)
    return await repo.get_history_for_user(current_user.id)
