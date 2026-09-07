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


class StrikeData(BaseModel):
    """Strike volume and volatility data for Vol2Vol Expected Range."""

    strike: float = Field(..., description="Strike price (USD)")
    put_volume: int = Field(0, description="EOD Put Volume")
    call_volume: int = Field(0, description="EOD Call Volume")
    vol_settle: float = Field(..., description="Implied Volatility settle %")
    delta_label: Optional[str] = Field(None, description="e.g. '25ΔP' or '25ΔC'")


class DeltaZone(BaseModel):
    """Delta benchmark zone."""

    label: str = Field(..., description="e.g. '5ΔP', '25ΔP', 'ATM', '25ΔC', '5ΔC'")
    strike: float = Field(..., description="Strike price at this delta")


class GoldVol2VolRange(BaseModel):
    """CME QuikStrike Vol2Vol Expected Range payload."""

    product: str = Field("Gold (OG|GC)", description="Product name")
    expiration: str = Field(..., description="Expiration symbol, e.g. OG2U6")
    dte: float = Field(..., description="Days to expiration")
    spot_price: float = Field(..., description="Underlying futures spot price")
    spot_change: float = Field(..., description="Daily spot change")
    strikes: list[StrikeData] = Field(..., description="Strike list from low to high")
    delta_zones: list[DeltaZone] = Field(..., description="Standard deviation delta markers")
    put_wall_strike: float = Field(..., description="Strike with largest Put volume/support")
    call_wall_strike: float = Field(..., description="Strike with largest Call volume/resistance")
    expected_range_low: float = Field(..., description="1-sigma lower bound")
    expected_range_high: float = Field(..., description="1-sigma upper bound")
    last_updated: datetime = Field(..., description="Quote timestamp")


class ExpirationOIData(BaseModel):
    """Open Interest and Volume for an individual contract expiration."""

    expiration: str = Field(..., description="e.g. OG2U6, OGV6, OGX6, OGZ6")
    call_oi: int = Field(0, description="Call Open Interest")
    put_oi: int = Field(0, description="Put Open Interest")
    call_volume: int = Field(0, description="Call Volume")
    put_volume: int = Field(0, description="Put Volume")


class GoldOIProfile(BaseModel):
    """CME QuikStrike Open Interest Profile across expirations."""

    product: str = Field("Gold (OG|GC)", description="Product name")
    report_date: str = Field(..., description="Report date string, e.g. Fri, Sep 4, 2026")
    total_put_oi: int = Field(..., description="Total Put Open Interest")
    total_call_oi: int = Field(..., description="Total Call Open Interest")
    oi_pc_ratio: float = Field(..., description="Put/Call ratio for Open Interest")
    total_put_volume: int = Field(..., description="Total Put Volume")
    total_call_volume: int = Field(..., description="Total Call Volume")
    volume_pc_ratio: float = Field(..., description="Put/Call ratio for Volume")
    expirations: list[ExpirationOIData] = Field(..., description="Breakdown by contract month")
    last_updated: datetime = Field(..., description="Report timestamp")

