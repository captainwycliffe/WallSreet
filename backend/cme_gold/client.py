"""
Databento REST client + CFTC Socrata client for CME Gold data.

Databento docs: https://databento.com/docs/api-reference-live/get-symbology
CFTC Socrata:   https://publicreporting.cftc.gov/resource/jun7-hz2v.json

Auth:
  Databento — Basic auth with API key as username, empty password.
  CFTC       — No auth required.

Both functions are isolated behind thin wrapper signatures so they can be
replaced with the official CME real-time SDK without touching anything else.
"""
from __future__ import annotations

import base64
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─── Databento config ─────────────────────────────────────────────────────────
_DATABENTO_API_KEY = os.getenv("DATABENTO_API_KEY", "")
_DATABENTO_BASE = "https://hist.databento.com/v0"
_DATASET = "GLBX.MDP3"   # CME Globex MDP 3.0
_GC_SYMBOL = "GC.FUT"    # Gold front-month continuous
_MGC_SYMBOL = "MGC.FUT"  # Micro Gold

# ─── CFTC config ──────────────────────────────────────────────────────────────
_CFTC_BASE = "https://publicreporting.cftc.gov/resource/jun7-hz2v.json"
_GOLD_COMMODITY_CODE = "088"


def _databento_auth() -> dict[str, str]:
    """Return Authorization header for Databento Basic auth."""
    if not _DATABENTO_API_KEY:
        raise ValueError("DATABENTO_API_KEY environment variable is not set")
    raw = f"{_DATABENTO_API_KEY}:"
    token = base64.b64encode(raw.encode()).decode()
    return {"Authorization": f"Basic {token}"}


# ─── Databento: latest GC quote ───────────────────────────────────────────────

async def fetch_gold_quote(symbol: str = _GC_SYMBOL) -> dict:
    """
    Fetch the latest quote for a Gold futures symbol from Databento.

    Uses the /timeseries.get_range endpoint (REST) requesting the last
    available OHLCV-1d bar — this avoids a persistent WebSocket and gives
    us close price, volume, and open interest.

    Returns a dict matching the GoldQuote schema fields.
    """
    headers = _databento_auth()

    # Request the latest daily OHLCV bar (end = today, count = 2 so we get
    # yesterday's close for the change calculation).
    today = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    params = {
        "dataset": _DATASET,
        "symbols": symbol,
        "schema": "ohlcv-1d",
        "stype_in": "continuous",
        "start": "2000-01-01",  # Databento requires start; server will honour limit
        "limit": 2,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_DATABENTO_BASE}/timeseries.get_range",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()

    # Databento returns DBZ (binary) or JSON depending on Accept header.
    # For simplicity we use the JSON metadata endpoint to get last price.
    # Fall back to the /metadata endpoint which is always JSON.
    data = resp.json()

    # The response contains a list of records.  Each record has:
    # ts_event (nanoseconds epoch), open, high, low, close, volume
    # Fields are integers scaled by 1e-9 for prices.
    records = data.get("data", []) or data.get("records", [])

    if len(records) < 1:
        raise ValueError(f"No OHLCV records returned for {symbol}")

    latest = records[-1]
    prev = records[-2] if len(records) >= 2 else None

    price = int(latest.get("close", 0)) / 1e9
    prev_price = int(prev.get("close", 0)) / 1e9 if prev else price
    change = round(price - prev_price, 2)
    change_pct = round((change / prev_price) * 100, 3) if prev_price else 0.0
    volume = int(latest.get("volume", 0))
    open_interest = int(latest.get("open_interest", 0)) if "open_interest" in latest else 0

    # ts_event is nanoseconds since Unix epoch
    ts_ns = int(latest.get("ts_event", 0))
    ts = datetime.fromtimestamp(ts_ns / 1e9, tz=timezone.utc) if ts_ns else datetime.now(timezone.utc)

    return {
        "symbol": symbol,
        "price": price,
        "change": change,
        "change_pct": change_pct,
        "volume": volume,
        "open_interest": open_interest,
        "timestamp": ts,
        "is_delayed": True,   # REST hist data is always "delayed" relative to live tick
        "stale": False,
    }


# ─── CFTC COT: latest Gold positioning ────────────────────────────────────────

async def fetch_gold_positioning() -> dict:
    """
    Fetch the most recent CFTC COT Gold report row from Socrata.

    Returns a dict matching the GoldPositioning schema fields.
    """
    params = {
        "cftc_commodity_code": _GOLD_COMMODITY_CODE,
        "$order": "report_date_as_yyyy_mm_dd DESC",
        "$limit": 1,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(_CFTC_BASE, params=params)
        resp.raise_for_status()

    rows = resp.json()
    if not rows:
        raise ValueError("No COT rows returned for Gold from CFTC")

    row = rows[0]

    noncomm_long = int(float(row.get("noncomm_positions_long_all", 0)))
    noncomm_short = int(float(row.get("noncomm_positions_short_all", 0)))
    comm_long = int(float(row.get("comm_positions_long_all", 0)))
    comm_short = int(float(row.get("comm_positions_short_all", 0)))
    net_spec = noncomm_long - noncomm_short

    report_date = str(row.get("report_date_as_yyyy_mm_dd", ""))[:10]

    return {
        "report_date": report_date,
        "noncomm_long": noncomm_long,
        "noncomm_short": noncomm_short,
        "comm_long": comm_long,
        "comm_short": comm_short,
        "net_speculator": net_spec,
        "stale": False,
    }
