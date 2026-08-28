"""
FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import (
    AppError,
    app_error_handler,
    general_exception_handler,
)
from app.core.logging import setup_logging
from app.db.session import engine

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting MT5 Trade Monitor Backend v%s", settings.APP_VERSION)

    # Import here to avoid circular imports
    from app.db.base import Base
    from app.db.session import engine

    # Auto-create tables (for development; use Alembic for production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified")

    # Seed demo data if enabled
    if settings.SEED_DEMO_DATA:
        try:
            from app.db.seed import seed_demo_data
            from app.db.session import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                await seed_demo_data(session)
        except Exception as e:
            logger.warning("Demo data seeding skipped: %s", e)

    # Start background tasks
    from app.services.ea_service import ea_service
    _ea_monitor_task = asyncio.create_task(
        ea_service.run_offline_monitor(), name="ea_offline_monitor"
    )

    logger.info("Backend ready ✓")
    yield

    # Shutdown
    logger.info("Shutting down...")
    _ea_monitor_task.cancel()
    try:
        await _ea_monitor_task
    except asyncio.CancelledError:
        pass
    await engine.dispose()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="MT5 Trade Monitor",
        description="Real-time MT5 trading monitoring and analytics backend.",
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ─── CORS ────────────────────────────────────────────────────────────────
    origins = (
        ["*"]
        if settings.CORS_ALLOW_ALL
        else settings.ALLOWED_ORIGINS
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Exception handlers ───────────────────────────────────────────────────
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # ─── Routers ──────────────────────────────────────────────────────────────
    from app.api.router import api_router
    from app.websocket.router import ws_router
    app.include_router(api_router, prefix="/api")
    app.include_router(ws_router)

    # ─── Health ───────────────────────────────────────────────────────────────
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_app()
