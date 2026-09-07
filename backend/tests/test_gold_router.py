"""
Tests for the CME Gold API endpoints.

Uses pytest-httpx to mock Databento and CFTC responses so no live network
calls are made.  Tests cover:
  - GET /api/gold/quote    → 200 with GoldQuote
  - GET /api/gold/positioning → 200 with GoldPositioning
  - GET /api/gold/summary  → 200 with GoldSummary
  - GET /api/gold/quote    → 503 when Databento is unreachable
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from cme_gold import cache
from cme_gold.schemas import GoldQuote, GoldPositioning, GoldSummary


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_cache():
    """Reset the in-memory cache between tests."""
    from cme_gold.cache import _store, _timestamps
    _store.clear()
    _timestamps.clear()
    yield
    _store.clear()
    _timestamps.clear()


@pytest.fixture
def client():
    """Test client with Gold router mounted directly (no full app needed)."""
    from fastapi import FastAPI
    from cme_gold.router import router as gold_router

    app = FastAPI()
    app.include_router(gold_router, prefix="/api")
    return TestClient(app)


# ─── Sample data ──────────────────────────────────────────────────────────────

SAMPLE_QUOTE = {
    "symbol": "GC.FUT",
    "price": 2650.50,
    "change": 12.30,
    "change_pct": 0.466,
    "volume": 142300,
    "open_interest": 421000,
    "timestamp": datetime(2026, 9, 7, 9, 0, 0, tzinfo=timezone.utc),
    "is_delayed": True,
    "stale": False,
}

SAMPLE_POSITIONING = {
    "report_date": "2026-09-02",
    "noncomm_long": 312000,
    "noncomm_short": 85000,
    "comm_long": 195000,
    "comm_short": 410000,
    "net_speculator": 227000,
    "stale": False,
}


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestGoldQuote:
    def test_returns_cached_quote(self, client):
        asyncio.get_event_loop().run_until_complete(cache.set_quote(SAMPLE_QUOTE))
        resp = client.get("/api/gold/quote")
        assert resp.status_code == 200
        data = resp.json()
        assert data["symbol"] == "GC.FUT"
        assert data["price"] == 2650.50
        assert data["volume"] == 142300

    def test_503_when_no_cache_and_fetch_fails(self, client, monkeypatch):
        async def _fail(*a, **kw):
            raise RuntimeError("Databento down")

        monkeypatch.setattr("cme_gold.client.fetch_gold_quote", _fail)
        resp = client.get("/api/gold/quote")
        assert resp.status_code == 503


class TestGoldPositioning:
    def test_returns_cached_positioning(self, client):
        asyncio.get_event_loop().run_until_complete(cache.set_positioning(SAMPLE_POSITIONING))
        resp = client.get("/api/gold/positioning")
        assert resp.status_code == 200
        data = resp.json()
        assert data["net_speculator"] == 227000
        assert data["report_date"] == "2026-09-02"

    def test_503_when_no_cache_and_fetch_fails(self, client, monkeypatch):
        async def _fail(*a, **kw):
            raise RuntimeError("CFTC down")

        monkeypatch.setattr("cme_gold.client.fetch_gold_positioning", _fail)
        resp = client.get("/api/gold/positioning")
        assert resp.status_code == 503


class TestGoldSummary:
    def test_returns_summary_with_both(self, client):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(cache.set_quote(SAMPLE_QUOTE))
        loop.run_until_complete(cache.set_positioning(SAMPLE_POSITIONING))
        resp = client.get("/api/gold/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "quote" in data
        assert "positioning" in data
        assert data["quote"]["price"] == 2650.50
        assert data["positioning"]["net_speculator"] == 227000

    def test_summary_without_positioning_still_200(self, client, monkeypatch):
        """Summary must succeed even when COT data is unavailable."""
        loop = asyncio.get_event_loop()
        loop.run_until_complete(cache.set_quote(SAMPLE_QUOTE))

        async def _fail(*a, **kw):
            raise RuntimeError("CFTC down")

        monkeypatch.setattr("cme_gold.client.fetch_gold_positioning", _fail)
        resp = client.get("/api/gold/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["positioning"] is None

    def test_summary_503_when_quote_unavailable(self, client, monkeypatch):
        async def _fail(*a, **kw):
            raise RuntimeError("Databento down")

        monkeypatch.setattr("cme_gold.client.fetch_gold_quote", _fail)
        resp = client.get("/api/gold/summary")
        assert resp.status_code == 503
