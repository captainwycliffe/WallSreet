from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Numeric, ForeignKey, Enum, DateTime
from app.db.base import Base, UUIDMixin, TimestampMixin
import enum

class EARegistrationStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"

class MT5Account(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "mt5_accounts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    broker: Mapped[str] = mapped_column(String, nullable=False)
    account_number: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False)
    balance: Mapped[float] = mapped_column(Numeric, default=0.0)
    equity: Mapped[float] = mapped_column(Numeric, default=0.0)
    margin: Mapped[float] = mapped_column(Numeric, default=0.0)
    free_margin: Mapped[float] = mapped_column(Numeric, default=0.0)
    open_pl: Mapped[float] = mapped_column(Numeric, default=0.0)
    daily_pl: Mapped[float] = mapped_column(Numeric, default=0.0)
    drawdown_pct: Mapped[float] = mapped_column(Numeric, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # ea_registrations = relationship("EARegistration", back_populates="account")

class EARegistration(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ea_registrations"

    account_id: Mapped[str] = mapped_column(ForeignKey("mt5_accounts.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    api_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    version: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[EARegistrationStatus] = mapped_column(Enum(EARegistrationStatus), default=EARegistrationStatus.OFFLINE)
    last_heartbeat: Mapped[DateTime] = mapped_column(DateTime, nullable=True)
    connected_since: Mapped[DateTime] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
