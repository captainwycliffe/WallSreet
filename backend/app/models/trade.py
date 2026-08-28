from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Numeric, ForeignKey, Enum, DateTime, BigInteger
from app.db.base import Base, UUIDMixin, TimestampMixin
import enum
from typing import Optional

class TradeStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

class TradeDirection(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

class Trade(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "trades"

    poi_id: Mapped[Optional[str]] = mapped_column(ForeignKey("pois.id"), nullable=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=False)
    mt5_ticket: Mapped[int] = mapped_column(BigInteger, index=True, unique=True, nullable=False)
    symbol: Mapped[str] = mapped_column(String, index=True, nullable=False)
    direction: Mapped[TradeDirection] = mapped_column(Enum(TradeDirection), nullable=False)
    volume: Mapped[float] = mapped_column(Numeric, nullable=False)
    entry_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    stop_loss: Mapped[float] = mapped_column(Numeric, nullable=False)
    take_profit: Mapped[float] = mapped_column(Numeric, nullable=False)
    current_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    exit_price: Mapped[Optional[float]] = mapped_column(Numeric, nullable=True)
    profit: Mapped[float] = mapped_column(Numeric, default=0.0)
    commission: Mapped[float] = mapped_column(Numeric, default=0.0)
    swap: Mapped[float] = mapped_column(Numeric, default=0.0)
    net_profit: Mapped[float] = mapped_column(Numeric, default=0.0)
    risk_amount: Mapped[float] = mapped_column(Numeric, default=0.0)
    reward_amount: Mapped[float] = mapped_column(Numeric, default=0.0)
    r_multiple: Mapped[float] = mapped_column(Numeric, default=0.0)
    pips: Mapped[float] = mapped_column(Numeric, default=0.0)
    status: Mapped[TradeStatus] = mapped_column(Enum(TradeStatus), nullable=False)
    opened_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    closed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    
    # poi = relationship("POI", back_populates="trade")
    # journal = relationship("TradeJournal", back_populates="trade", uselist=False)
