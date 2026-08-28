from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.mt5 import router as mt5_router
from app.api.pois import router as pois_router
from app.api.trades import router as trades_router
from app.api.analytics import router as analytics_router
from app.api.accounts import router as accounts_router
# These routers will be created shortly
# from app.api.journal import router as journal_router
# from app.api.risk import router as risk_router
# from app.api.ea import router as ea_router
# from app.api.notifications import router as notifications_router
from app.websocket.router import router as ws_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(mt5_router)
api_router.include_router(pois_router)
api_router.include_router(trades_router)
api_router.include_router(analytics_router)
api_router.include_router(accounts_router)
# api_router.include_router(journal_router)
# api_router.include_router(risk_router)
# api_router.include_router(ea_router)
# api_router.include_router(notifications_router)
api_router.include_router(ws_router)

@api_router.get("/status")
def status():
    return {"status": "ok"}
