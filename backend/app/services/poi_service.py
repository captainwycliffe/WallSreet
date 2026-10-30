from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.poi import POI, POIStatus
from app.models.account import MT5Account
from app.schemas.poi import POICreate, POIUpdate
from app.repositories.poi_repo import POIRepository
from app.services.notification_service import NotificationService
from app.events.bus import event_bus
from app.websocket.events import publish_poi_event
from datetime import datetime
from app.core.exceptions import NotFoundError
import logging

logger = logging.getLogger(__name__)

class POIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = POIRepository(db)
        self.notif_service = NotificationService(db)

    async def create_poi(self, account_id: str, ea_id: str, req: POICreate) -> POI:
        existing = await self.repo.get_by_idempotency_key(req.idempotency_key)
        if existing:
            return existing
            
        poi = POI(
            account_id=account_id,
            ea_id=ea_id,
            symbol=req.symbol,
            timeframe=req.timeframe,
            direction=req.direction,
            poi_type=req.poi_type,
            entry_price=req.entry_price,
            stop_loss=req.stop_loss,
            take_profit=req.take_profit,
            zone_high=req.zone_high,
            zone_low=req.zone_low,
            risk_reward=req.risk_reward,
            status=req.status if req.status else POIStatus.PENDING,
            idempotency_key=req.idempotency_key,
            metadata_data=req.metadata_data
        )
        poi = await self.repo.create(poi)
        
        await event_bus.emit("POI_CREATED", {
            "account_id": account_id,
            "poi_id": poi.id,
            "symbol": poi.symbol,
            "status": poi.status.value
        })

        # Send push & in-app notification to the user
        try:
            acc_res = await self.db.execute(select(MT5Account).where(MT5Account.id == account_id))
            acc = acc_res.scalar_one_or_none()
            if acc:
                entry_f = float(poi.entry_price)
                sl_f = float(poi.stop_loss)
                tp_f = float(poi.take_profit)
                title = f"🔔 Limit Order Placed"
                body = f"{poi.symbol} {poi.poi_type} placed @ {entry_f:.2f if entry_f > 100 else entry_f:.5f} (SL: {sl_f:.2f if sl_f > 100 else sl_f:.5f}, TP: {tp_f:.2f if tp_f > 100 else tp_f:.5f})"
                await self.notif_service.send_to_user(
                    user_id=acc.user_id,
                    notif_type="LIMIT_PLACED",
                    title=title,
                    body=body,
                    data={"poi_id": poi.id, "symbol": poi.symbol, "entry_price": entry_f}
                )
        except Exception as e:
            logger.warning("Failed to send limit placed notification: %s", e)
        
        return poi

    async def update_poi_status(self, poi_id: str, status: POIStatus) -> POI:
        poi = await self.repo.get(poi_id)
        if not poi:
            raise NotFoundError("POI not found")
            
        old_status = poi.status
        poi.status = status
        if status in [POIStatus.CLOSED, POIStatus.EXPIRED, POIStatus.CANCELLED, POIStatus.INVALIDATED, POIStatus.TP_HIT, POIStatus.SL_HIT]:
            poi.closed_at = datetime.utcnow()
        elif status == POIStatus.ACTIVE:
            poi.activated_at = datetime.utcnow()
            
        updated = await self.repo.update(poi)

        # Notify if activated
        if old_status != POIStatus.ACTIVE and status == POIStatus.ACTIVE:
            try:
                acc_res = await self.db.execute(select(MT5Account).where(MT5Account.id == poi.account_id))
                acc = acc_res.scalar_one_or_none()
                if acc:
                    entry_f = float(poi.entry_price)
                    title = f"⚡ Limit Order Activated"
                    body = f"{poi.symbol} limit triggered and filled at {entry_f:.2f if entry_f > 100 else entry_f:.5f}!"
                    await self.notif_service.send_to_user(
                        user_id=acc.user_id,
                        notif_type="LIMIT_ACTIVATED",
                        title=title,
                        body=body,
                        data={"poi_id": poi.id, "symbol": poi.symbol}
                    )
            except Exception as e:
                logger.warning("Failed to send limit activated notification: %s", e)

        return updated
