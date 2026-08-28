from sqlalchemy.ext.asyncio import AsyncSession
from app.models.poi import POI, POIStatus
from app.schemas.poi import POICreate, POIUpdate
from app.repositories.poi_repo import POIRepository
from app.events.bus import event_bus
from datetime import datetime
from app.core.exceptions import NotFoundError

class POIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = POIRepository(db)

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
            status=POIStatus.DETECTED,
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
        
        return poi

    async def update_poi_status(self, poi_id: str, status: POIStatus) -> POI:
        poi = await self.repo.get(poi_id)
        if not poi:
            raise NotFoundError("POI not found")
            
        poi.status = status
        if status in [POIStatus.CLOSED, POIStatus.EXPIRED, POIStatus.CANCELLED, POIStatus.INVALIDATED, POIStatus.TP_HIT, POIStatus.SL_HIT]:
            poi.closed_at = datetime.utcnow()
        elif status == POIStatus.ACTIVE:
            poi.activated_at = datetime.utcnow()
            
        return await self.repo.update(poi)
