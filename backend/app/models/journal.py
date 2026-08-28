from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Text, JSON, Integer
from app.db.base import Base, UUIDMixin, TimestampMixin
from typing import Optional

class TradeJournal(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "trade_journals"

    trade_id: Mapped[str] = mapped_column(ForeignKey("trades.id"), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    lessons: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    setup_quality: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # trade = relationship("Trade", back_populates="journal")
