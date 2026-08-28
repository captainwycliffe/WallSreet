from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, Enum, DateTime, JSON, func
from app.db.base import Base, UUIDMixin
import enum
from typing import Optional
from datetime import datetime

class EventType(str, enum.Enum):
    POI_CREATED = "POI_CREATED"
    POI_UPDATED = "POI_UPDATED"
    POI_EXPIRED = "POI_EXPIRED"
    POSITION_OPENED = "POSITION_OPENED"
    POSITION_UPDATED = "POSITION_UPDATED"
    POSITION_CLOSED = "POSITION_CLOSED"
    SL_HIT = "SL_HIT"
    TP_HIT = "TP_HIT"
    EA_ONLINE = "EA_ONLINE"
    EA_OFFLINE = "EA_OFFLINE"
    ACCOUNT_UPDATED = "ACCOUNT_UPDATED"
    RISK_WARNING = "RISK_WARNING"

class Event(Base, UUIDMixin):
    __tablename__ = "events"

    account_id: Mapped[str] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=False)
    ea_id: Mapped[Optional[str]] = mapped_column(ForeignKey("ea_registrations.id"), nullable=True)
    poi_id: Mapped[Optional[str]] = mapped_column(ForeignKey("pois.id"), nullable=True)
    trade_id: Mapped[Optional[str]] = mapped_column(ForeignKey("trades.id"), nullable=True)
    type: Mapped[EventType] = mapped_column(Enum(EventType), index=True, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True, nullable=False)
