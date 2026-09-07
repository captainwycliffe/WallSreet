"""
APScheduler-based background polling for CME Gold data.

* Databento quote  — polled every QUOTE_INTERVAL_MINUTES  (default: 5)
* CFTC COT report — polled every COT_INTERVAL_HOURS       (default: 6)

The scheduler is started inside the FastAPI lifespan so it shares the same
async event loop.  Failures are caught and logged; the last good cached value
remains available.
"""
from __future__ import annotations

import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from cme_gold import cache, client

logger = logging.getLogger(__name__)

QUOTE_INTERVAL_MINUTES = int(os.getenv("GOLD_QUOTE_INTERVAL_MINUTES", "5"))
COT_INTERVAL_HOURS = int(os.getenv("GOLD_COT_INTERVAL_HOURS", "6"))

_scheduler: AsyncIOScheduler | None = None


async def _poll_quote() -> None:
    try:
        data = await client.fetch_gold_quote()
        await cache.set_quote(data)
        logger.info("[Gold] Quote updated: %s @ %.2f", data["symbol"], data["price"])
    except Exception as exc:
        logger.warning("[Gold] Quote poll failed: %s", exc)


async def _poll_positioning() -> None:
    try:
        data = await client.fetch_gold_positioning()
        await cache.set_positioning(data)
        logger.info("[Gold] COT updated: report_date=%s, net_spec=%d", data["report_date"], data["net_speculator"])
    except Exception as exc:
        logger.warning("[Gold] COT poll failed: %s", exc)


def start_scheduler() -> None:
    """Start the background polling scheduler.  Call once during app startup."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = AsyncIOScheduler(timezone="UTC")

    _scheduler.add_job(
        _poll_quote,
        trigger=IntervalTrigger(minutes=QUOTE_INTERVAL_MINUTES),
        id="gold_quote_poll",
        replace_existing=True,
        max_instances=1,
    )

    _scheduler.add_job(
        _poll_positioning,
        trigger=IntervalTrigger(hours=COT_INTERVAL_HOURS),
        id="gold_cot_poll",
        replace_existing=True,
        max_instances=1,
    )

    _scheduler.start()
    logger.info(
        "[Gold] Scheduler started — quote every %d min, COT every %d h",
        QUOTE_INTERVAL_MINUTES,
        COT_INTERVAL_HOURS,
    )


def stop_scheduler() -> None:
    """Stop the scheduler gracefully."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Gold] Scheduler stopped")
