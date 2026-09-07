"""
FastAPI router for CME Gold market data.

Endpoints:
  GET /gold/quote       — latest GC futures quote
  GET /gold/positioning — latest CFTC COT Gold positioning
  GET /gold/summary     — combined GoldSummary (used by the mobile app)

All endpoints serve cached data.  If the cache is empty AND a live fetch
succeeds, the result is cached and returned.  If the live fetch also fails,
a 503 is returned with an informative error message.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from cme_gold import cache, client
from cme_gold.schemas import GoldQuote, GoldPositioning, GoldSummary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gold", tags=["Gold"])


async def _require_quote() -> dict:
    """Return quote from cache; fall back to live fetch; raise 503 on total failure."""
    data = await cache.get_quote()
    if data is None:
        try:
            data = await client.fetch_gold_quote()
            await cache.set_quote(data)
        except Exception as exc:
            logger.error("[Gold] Cannot serve quote: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="Gold quote unavailable. Check DATABENTO_API_KEY and connectivity.",
            )
    return data


async def _optional_positioning() -> dict | None:
    """Return positioning from cache; fall back to live fetch; return None on failure."""
    data = await cache.get_positioning()
    if data is None:
        try:
            data = await client.fetch_gold_positioning()
            await cache.set_positioning(data)
        except Exception as exc:
            logger.warning("[Gold] COT fetch failed (non-fatal): %s", exc)
            return None
    return data


@router.get("/quote", response_model=GoldQuote, summary="Latest GC futures quote")
async def get_gold_quote() -> GoldQuote:
    """Return the latest CME Gold (GC) futures price, volume, and open interest."""
    data = await _require_quote()
    return GoldQuote(**data)


@router.get("/positioning", response_model=GoldPositioning, summary="CFTC COT Gold positioning")
async def get_gold_positioning() -> GoldPositioning:
    """Return the latest CFTC Commitment of Traders report for Gold."""
    data = await cache.get_positioning()
    if data is None:
        try:
            data = await client.fetch_gold_positioning()
            await cache.set_positioning(data)
        except Exception as exc:
            logger.error("[Gold] COT unavailable: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="CFTC COT data temporarily unavailable.",
            )
    return GoldPositioning(**data)


@router.get("/summary", response_model=GoldSummary, summary="Gold Insights summary")
async def get_gold_summary() -> GoldSummary:
    """
    Combined endpoint used by the mobile Gold Insights card.

    Always returns a quote (or 503).  Positioning may be None if CFTC is
    temporarily unreachable.
    """
    quote_data = await _require_quote()
    pos_data = await _optional_positioning()

    return GoldSummary(
        quote=GoldQuote(**quote_data),
        positioning=GoldPositioning(**pos_data) if pos_data else None,
        last_updated=datetime.now(timezone.utc),
    )
