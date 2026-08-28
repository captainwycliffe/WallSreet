from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Numeric, ForeignKey, Enum, DateTime, JSON
from app.db.base import Base, UUIDMixin, TimestampMixin
import enum
from typing import Optional

class POIStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    TP_HIT = "TP_HIT"
    SL_HIT = "SL_HIT"
    CLOSED = "CLOSED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    INVALIDATED = "INVALIDATED"

class Direction(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

class POI(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pois"

    account_id: Mapped[str] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=False)
    ea_id: Mapped[str] = mapped_column(ForeignKey("ea_registrations.id"), nullable=False)
    symbol: Mapped[str] = mapped_column(String, index=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String, nullable=False)
    direction: Mapped[Direction] = mapped_column(Enum(Direction), nullable=False)
    poi_type: Mapped[str] = mapped_column(String, nullable=False)
    entry_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    stop_loss: Mapped[float] = mapped_column(Numeric, nullable=False)
    take_profit: Mapped[float] = mapped_column(Numeric, nullable=False)
    zone_high: Mapped[float] = mapped_column(Numeric, nullable=False)
    zone_low: Mapped[float] = mapped_column(Numeric, nullable=False)
    risk_reward: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[POIStatus] = mapped_column(Enum(POIStatus), index=True, nullable=False)
    activated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[Optional[DateTime]] = mapped_column(DateTime, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    metadata_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # trade = relationship("Trade", back_populates="poi")
