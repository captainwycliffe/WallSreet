"""
In-memory cache for Gold quote and COT positioning.

A simple dict-based cache with timestamp tracking and stale-flag logic.
No external dependencies — swappable for Redis later.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

_QUOTE_TTL = timedelta(minutes=15)
_POSITIONING_TTL = timedelta(hours=25)  # COT is weekly; 25 h gives a buffer

_store: dict[str, Any] = {}
_timestamps: dict[str, datetime] = {}
_lock = asyncio.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def set_quote(data: dict) -> None:
    async with _lock:
        _store["quote"] = data
        _timestamps["quote"] = _now()


async def get_quote() -> Optional[dict]:
    async with _lock:
        if "quote" not in _store:
            return None
        data = dict(_store["quote"])
        age = _now() - _timestamps["quote"]
        data["stale"] = age > _QUOTE_TTL
        return data


async def set_positioning(data: dict) -> None:
    async with _lock:
        _store["positioning"] = data
        _timestamps["positioning"] = _now()


async def get_positioning() -> Optional[dict]:
    async with _lock:
        if "positioning" not in _store:
            return None
        data = dict(_store["positioning"])
        age = _now() - _timestamps["positioning"]
        data["stale"] = age > _POSITIONING_TTL
        return data
