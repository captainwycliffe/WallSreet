"""Pydantic schemas for CME Gold data."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class GoldQuote(BaseModel):
    """Latest GC/MGC futures quote from Databento."""

    symbol: str = Field(..., description="Futures symbol, e.g. GC.FUT")
    price: float = Field(..., description="Last traded / best-bid-mid price (USD)")
    change: float = Field(..., description="Price change from prior close")
    change_pct: float = Field(..., description="Percent change from prior close")
    volume: int = Field(..., description="Session cumulative volume (contracts)")
    open_interest: int = Field(..., description="Open interest (contracts)")
    timestamp: datetime = Field(..., description="Quote timestamp (UTC)")
    is_delayed: bool = Field(False, description="True if data is delayed / from cache")
    stale: bool = Field(False, description="True if the cached value is older than 15 min")


class GoldPositioning(BaseModel):
    """CFTC Commitment of Traders (COT) Gold positioning row."""

    report_date: str = Field(..., description="COT report date (YYYY-MM-DD)")
    noncomm_long: int = Field(..., description="Non-commercial (speculator) long contracts")
    noncomm_short: int = Field(..., description="Non-commercial short contracts")
    comm_long: int = Field(..., description="Commercial (hedger) long contracts")
    comm_short: int = Field(..., description="Commercial short contracts")
    net_speculator: int = Field(..., description="Net speculator position (long - short)")
    stale: bool = Field(False, description="True if cached value is older than 24 h")


class GoldSummary(BaseModel):
    """Combined Gold Insights payload returned to the mobile app."""

    quote: GoldQuote
    positioning: Optional[GoldPositioning] = None
    last_updated: datetime = Field(..., description="When this summary was assembled (UTC)")
