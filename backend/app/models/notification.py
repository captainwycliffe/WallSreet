from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, Enum, DateTime, JSON, Boolean
from app.db.base import Base, UUIDMixin, TimestampMixin
from app.models.user import User  # noqa: F401
import enum
from typing import Optional
from datetime import datetime

class Platform(str, enum.Enum):
    ios = "ios"
    android = "android"
    web = "web"

class PushToken(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "push_tokens"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    token: Mapped[str] = mapped_column(String, nullable=False)
    platform: Mapped[Platform] = mapped_column(Enum(Platform), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class NotificationLog(Base, UUIDMixin):
    __tablename__ = "notification_logs"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=False)
