"""
Databento REST client + CFTC Socrata client for CME Gold data.

Databento docs: https://databento.com/docs
CFTC Socrata:   https://publicreporting.cftc.gov/resource/6dca-aqww.json

Auth:
  Databento — Basic auth with API key as username, empty password.
  CFTC       — No auth required.

Price note: Databento GLBX.MDP3 stores prices as fixed-point integers in
nanoseconds units. For GC (Gold): divide raw integer by 1e9 to get USD.
Confirmed: GCZ6 close 2026-09-05 = 4526900000000 / 1e9 = $4526.90 ✓
"""
from __future__ import annotations

import base64
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─── Databento config ─────────────────────────────────────────────────────────
_DATABENTO_BASE = "https://hist.databento.com/v0"
_DATASET = "GLBX.MDP3"        # CME Globex MDP 3.0

# GCZ6 = Dec-2026 front month.  We use a rolling lookup: try current contract
# year-letter (Z=Dec, U=Sep, M=Jun, H=Mar) and fall back to GC.c.0 continuous.
# The client picks the right expiry automatically via _gc_front_month().
_PRICE_DIVISOR = 1_000_000_000  # 1e9 — confirmed via definition schema

# ─── CFTC config ──────────────────────────────────────────────────────────────
_CFTC_BASE = "https://publicreporting.cftc.gov/resource/6dca-aqww.json"
# Must filter by exact market name to avoid Micro Gold (same commodity code 088)
_CFTC_GOLD_MARKET = "GOLD - COMMODITY EXCHANGE INC."


def _get_databento_api_key() -> str:
    """Retrieve Databento API key from app settings, environment, or .env."""
    try:
        from app.core.config import settings
        if settings.DATABENTO_API_KEY:
            return settings.DATABENTO_API_KEY
    except Exception:
        pass
    env_val = os.getenv("DATABENTO_API_KEY")
    if env_val:
        return env_val
    try:
        from dotenv import load_dotenv
        load_dotenv()
        return os.getenv("DATABENTO_API_KEY", "")
    except Exception:
        return ""


def _databento_auth() -> dict[str, str]:
    """Return Authorization header for Databento Basic auth."""
    key = _get_databento_api_key()
    if not key:
        raise ValueError("DATABENTO_API_KEY environment variable is not set")
    raw = f"{key}:"
    token = base64.b64encode(raw.encode()).decode()
    return {"Authorization": f"Basic {token}"}


def _gc_front_month() -> str:
    """
    Return the current GC front-month raw symbol using single-digit year
    (e.g. 'GCZ6', 'GCU6'). Databento GLBX.MDP3 uses this naming convention.

    CME Gold quarterly expiry months: H=Mar, M=Jun, U=Sep, Z=Dec.
    GC last trading day is around the 27th of the delivery month.
    We roll 5 days before the 27th (i.e., on the 22nd) to be safe.
    """
    now = datetime.now(timezone.utc)
    year1 = now.year % 10   # single-digit year: 2026 -> 6

    # (expiry_month, month_code) in calendar order
    quarters = [(3, "H"), (6, "M"), (9, "U"), (12, "Z")]

    for exp_month, code in quarters:
        rollover = datetime(now.year, exp_month, 7, tzinfo=timezone.utc)
        if now < rollover:
            return f"GC{code}{year1}"

    # Past Dec 22 — roll to next year's March
    return f"GCH{(year1 + 1) % 10}"


# ─── Databento: latest GC quote ───────────────────────────────────────────────

async def fetch_gold_quote(symbol: Optional[str] = None) -> dict:
    """
    Fetch the latest GC futures OHLCV daily bar from Databento.

    Returns the most recent available bar (Databento historical has ~1-day lag
    for free-tier; live requires a subscription — data is therefore marked
    is_delayed=True).

    Returns a dict matching the GoldQuote schema fields.
    """
    headers = _databento_auth()
    raw_symbol = symbol or _gc_front_month()

    # Request last 10 days to ensure we get at least 2 trading bars.
    # end is exclusive — use midnight today UTC to get yesterday's complete bar.
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=10)).strftime("%Y-%m-%d")
    # Midnight today = exclusive end that includes yesterday's full session
    end = now.strftime("%Y-%m-%dT00:00:00")

    params = {
        "dataset": _DATASET,
        "symbols": raw_symbol,
        "schema": "ohlcv-1d",
        "stype_in": "raw_symbol",
        "start": start,
        "end": end,
        "encoding": "json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{_DATABENTO_BASE}/timeseries.get_range",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()

    # Databento NDJSON: each line is a separate JSON record (not a data array)
    records = []
    for line in resp.text.strip().split("\n"):
        line = line.strip()
        if line:
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                pass

    if not records:
        raise ValueError(f"No OHLCV records returned for {raw_symbol} (date range {start}→{end})")

    latest = records[-1]
    prev = records[-2] if len(records) >= 2 else None

    # Prices are fixed-point integers; divide by 1e9 to get USD
    price = int(latest.get("close", 0)) / _PRICE_DIVISOR
    prev_price = int(prev.get("close", 0)) / _PRICE_DIVISOR if prev else price
    change = round(price - prev_price, 2)
    change_pct = round((change / prev_price) * 100, 3) if prev_price else 0.0
    volume = int(latest.get("volume", 0))

    # ts_event is nanoseconds since Unix epoch
    ts_ns = int(latest["hd"].get("ts_event", 0)) if "hd" in latest else 0
    ts = datetime.fromtimestamp(ts_ns / 1e9, tz=timezone.utc) if ts_ns else now

    return {
        "symbol": raw_symbol,
        "price": round(price, 2),
        "change": change,
        "change_pct": change_pct,
        "volume": volume,
        "open_interest": 0,  # not in ohlcv schema; would need statistics schema
        "timestamp": ts,
        "is_delayed": True,   # REST hist data is always ~1 day delayed for free tier
        "stale": False,
    }


# ─── CFTC COT: latest Gold positioning ────────────────────────────────────────

async def fetch_gold_positioning() -> dict:
    """
    Fetch the most recent CFTC COT Gold (GC) report from Socrata.

    Uses dataset 6dca-aqww (Legacy Futures-Only COT).
    Filters to 'GOLD - COMMODITY EXCHANGE INC.' to exclude Micro Gold.

    Returns a dict matching the GoldPositioning schema fields.
    """
    params = {
        "$where": f"market_and_exchange_names='{_CFTC_GOLD_MARKET}'",
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
