from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.db.session import get_session
from app.core.dependencies import get_current_active_user
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.models.notification import PushToken, NotificationLog
from app.schemas.notification import (
    PushTokenRegister,
    PushTokenResponse,
    NotificationLogResponse,
)
from app.repositories.notification_repo import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["notifications"])


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


@router.get("/poll", response_model=List[NotificationLogResponse])
async def poll_notifications_background(
    key: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_session)
):
    """
    Lightweight endpoint used by the Android Native Foreground Service
    to poll recent notifications 24/7 even when the mobile UI is closed.
    """
    if key != "mt5ea_demo_key_12345":
        raise HTTPException(status_code=401, detail="Invalid background poll key")

    stmt = (
        select(NotificationLog)
        .order_by(desc(NotificationLog.sent_at))
        .limit(15)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())
