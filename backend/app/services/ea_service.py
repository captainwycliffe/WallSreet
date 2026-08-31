"""
EA (Expert Advisor) service — tracks heartbeat-driven ONLINE/OFFLINE
status for registered EAs and runs a background monitor that flips
EAs to OFFLINE when their heartbeat goes stale, publishing a WS event
when that happens.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.account import EARegistration, EARegistrationStatus
from app.repositories.account_repo import AccountRepository
from app.services.notification_service import NotificationService
from app.websocket.events import publish_ea_event

logger = logging.getLogger(__name__)


class EAService:
    """Singleton service for EA heartbeat/offline monitoring."""

    def __init__(self) -> None:
        self._running = False

    async def run_offline_monitor(self) -> None:
        """
        Background loop: every EA_HEARTBEAT_TIMEOUT_SECONDS, check all
        active EA registrations. Any EA whose last_heartbeat is older
        than EA_OFFLINE_ALERT_AFTER_SECONDS is flipped ONLINE -> OFFLINE
        and an EA_OFFLINE event is published to its account's WS room.
        """
        self._running = True
        logger.info("EA offline monitor started")
        try:
            while self._running:
                try:
                    await self._check_offline_eas()
                except Exception:
                    logger.exception("Error while checking EA offline status")
                await asyncio.sleep(settings.EA_HEARTBEAT_TIMEOUT_SECONDS)
        except asyncio.CancelledError:
            logger.info("EA offline monitor stopping")
            raise
        finally:
            self._running = False

    async def _check_offline_eas(self) -> None:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            seconds=settings.EA_OFFLINE_ALERT_AFTER_SECONDS
        )

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(EARegistration).where(
                    EARegistration.is_active == True,  # noqa: E712
                    EARegistration.status == EARegistrationStatus.ONLINE,
                )
            )
            eas = list(result.scalars().all())

            for ea in eas:
                if ea.last_heartbeat and ea.last_heartbeat < cutoff:
                    ea.status = EARegistrationStatus.OFFLINE
                    db.add(ea)
                    logger.info(
                        "EA %s (account %s) marked OFFLINE — last heartbeat %s",
                        ea.id,
                        ea.account_id,
                        ea.last_heartbeat,
                    )
                    await publish_ea_event(
                        str(ea.account_id),
                        "EA_OFFLINE",
                        {
                            "ea_id": str(ea.id),
                            "name": ea.name,
                            "last_heartbeat": ea.last_heartbeat.isoformat()
                            if ea.last_heartbeat
                            else None,
                        },
                    )
                    await self._notify_owner_offline(db, ea)

            if eas:
                await db.commit()

    async def _notify_owner_offline(self, db, ea: EARegistration) -> None:
        try:
            account_repo = AccountRepository(db)
            account = await account_repo.get(ea.account_id)
            if not account:
                return
            notif_service = NotificationService(db)
            await notif_service.send_to_user(
                user_id=account.user_id,
                notif_type="EA_OFFLINE",
                title="EA went offline",
                body=f"{ea.name} on {account.name} stopped sending heartbeats.",
                data={"ea_id": str(ea.id), "account_id": str(account.id)},
            )
        except Exception:
            logger.exception("Failed to send EA_OFFLINE push notification")

    def stop(self) -> None:
        self._running = False


ea_service = EAService()
