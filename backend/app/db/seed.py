"""
Comprehensive demo data seeder.
Creates realistic data for development/demo mode.

User: demo@mt5app.com / demo1234
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, hash_api_key
from app.models.account import MT5Account, EARegistration, EARegistrationStatus
from app.models.event import Event, EventType
from app.models.journal import TradeJournal
from app.models.notification import PushToken
from app.models.poi import POI, POIStatus, Direction
from app.models.trade import Trade, TradeStatus, TradeDirection
from app.models.user import User

logger = logging.getLogger(__name__)


def utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


async def seed_demo_data(session: AsyncSession) -> None:
    """
    Idempotent seed — skips if demo user already exists.
    """
    existing = await session.execute(
        select(User).where(User.email == "demo@mt5app.com")
    )
    if existing.scalar_one_or_none():
        logger.info("Demo data already seeded — skipping")
        return

    logger.info("Seeding demo data...")
    now = datetime.now(timezone.utc)

    # ─── User ─────────────────────────────────────────────────────────────────
    user = User(
        email="demo@mt5app.com",
        username="DemoTrader",
        password_hash=hash_password("demo1234"),
        is_active=True,
        is_superuser=False,
    )
    session.add(user)
    await session.flush()

    # ─── Accounts ─────────────────────────────────────────────────────────────
    main_acc = MT5Account(
        user_id=user.id,
        name="Main Account",
        broker="FTMO",
        account_number="98765432",
        currency="USD",
        balance=Decimal("10_000.00"),
        equity=Decimal("10_220.00"),
        margin=Decimal("100.00"),
        free_margin=Decimal("10_120.00"),
        open_pl=Decimal("220.00"),
        daily_pl=Decimal("340.00"),
        drawdown_pct=Decimal("1.80"),
        is_active=True,
        is_demo=False,
    )
    demo_acc = MT5Account(
        user_id=user.id,
        name="Demo Account",
        broker="IC Markets",
        account_number="11223344",
        currency="USD",
        balance=Decimal("5_000.00"),
        equity=Decimal("5_050.00"),
        margin=Decimal("0.00"),
        free_margin=Decimal("5_050.00"),
        open_pl=Decimal("50.00"),
        daily_pl=Decimal("0.00"),
        drawdown_pct=Decimal("0.00"),
        is_active=True,
        is_demo=True,
    )
    session.add_all([main_acc, demo_acc])
    await session.flush()

    # ─── EA Registrations ────────────────────────────────────────────────────
    # Plaintext key used by simulator: mt5ea_demo_key_12345
    DEMO_EA_KEY = "mt5ea_demo_key_12345"
    ea_main = EARegistration(
        account_id=main_acc.id,
        name="ICT EA v1",
        api_key=hash_api_key(DEMO_EA_KEY),
        version="1.4.2",
        status=EARegistrationStatus.ONLINE,
        last_heartbeat=now,
        connected_since=now - timedelta(hours=3),
        is_active=True,
    )
    ea_demo = EARegistration(
        account_id=demo_acc.id,
        name="Demo EA",
        api_key=hash_api_key("mt5ea_demo_key_67890"),
        version="1.0.0",
        status=EARegistrationStatus.OFFLINE,
        last_heartbeat=now - timedelta(minutes=35),
        connected_since=now - timedelta(days=2),
        is_active=True,
    )
    session.add_all([ea_main, ea_demo])
    await session.flush()

    # ─── POIs ─────────────────────────────────────────────────────────────────
    poi_definitions = [
        # (symbol, tf, direction, entry, sl, tp, type, status, created_offset_h)
        ("EURUSD", "M15", "BUY",  1.08500, 1.08300, 1.08900, "ORDER_BLOCK", "PENDING",    -2),
        ("GBPUSD", "H1",  "SELL", 1.26800, 1.27100, 1.26200, "FVG",         "PENDING",    -1),
        ("XAUUSD", "H4",  "BUY",  2320.00, 2305.00, 2350.00, "BREAKER",     "ACTIVE",     -6),
        ("NAS100", "H1",  "BUY",  18400.0, 18200.0, 18800.0, "ORDER_BLOCK", "TP_HIT",    -48),
        ("EURUSD", "M15", "BUY",  1.08200, 1.07900, 1.08700, "MITIGATION",  "TP_HIT",    -72),
        ("GBPUSD", "H4",  "SELL", 1.27200, 1.27600, 1.26400, "FVG",         "SL_HIT",    -96),
        ("USDJPY", "H1",  "BUY",  149.000, 148.500, 150.000, "ORDER_BLOCK", "EXPIRED",  -120),
        ("BTCUSD", "H4",  "BUY",  64000.0, 62000.0, 68000.0, "LIQUIDITY",   "PENDING",    -3),
    ]

    pois = []
    for sym, tf, dir_str, entry, sl, tp, poi_type, status_str, hours_ago in poi_definitions:
        created = now + timedelta(hours=hours_ago)
        direction = Direction.BUY if dir_str == "BUY" else Direction.SELL
        status = POIStatus(status_str)
        
        risk = abs(entry - sl)
        reward = abs(entry - tp)
        rr = round(reward / risk, 2) if risk > 0 else 2.0
        zone_range = risk * 0.3
        
        activated_at = None
        closed_at = None
        if status in (POIStatus.ACTIVE, POIStatus.TP_HIT, POIStatus.SL_HIT, POIStatus.CLOSED):
            activated_at = created + timedelta(hours=1)
        if status in (POIStatus.TP_HIT, POIStatus.SL_HIT, POIStatus.CLOSED, POIStatus.EXPIRED):
            closed_at = activated_at + timedelta(hours=abs(hours_ago) // 2) if activated_at else created + timedelta(hours=2)

        poi = POI(
            account_id=main_acc.id,
            ea_id=ea_main.id,
            symbol=sym,
            timeframe=tf,
            direction=direction,
            poi_type=poi_type,
            entry_price=Decimal(str(entry)),
            stop_loss=Decimal(str(sl)),
            take_profit=Decimal(str(tp)),
            zone_high=Decimal(str(entry + zone_range)),
            zone_low=Decimal(str(entry - zone_range)),
            risk_reward=Decimal(str(rr)),
            status=status,
            created_at=utc(created),
            activated_at=utc(activated_at) if activated_at else None,
            closed_at=utc(closed_at) if closed_at else None,
            expires_at=utc(created + timedelta(hours=24)) if status == POIStatus.PENDING else None,
            idempotency_key=f"seed_poi_{sym}_{dir_str}_{hours_ago}",
            metadata={
                "session": "London" if abs(hours_ago) < 12 else "NY",
                "signal_strength": 80,
                "strategy": "ICT_POI",
            },
        )
        session.add(poi)
        pois.append((poi, status_str, entry, sl, tp, dir_str, sym))

    await session.flush()

    # ─── Trades ───────────────────────────────────────────────────────────────
    # Link trades to ACTIVE, TP_HIT, SL_HIT POIs
    trade_definitions = [
        # (poi_index, ticket, volume, actual_entry, exit_price, profit, status, open_offset_h, close_offset_h)
        (2, 100000001, 0.10, 2320.50, None,    None,    "OPEN",   -5,   None),   # XAUUSD ACTIVE
        (3, 100000002, 0.10, 18402.0, 18800.0, 398.0,   "CLOSED", -47, -24),    # NAS100 TP HIT
        (4, 100000003, 0.05, 1.08205, 1.08700, 247.50,  "CLOSED", -71, -48),    # EURUSD TP HIT
        (5, 100000004, 0.10, 1.27195, 1.27600, -405.0,  "CLOSED", -95, -72),    # GBPUSD SL HIT
    ]

    trades = []
    for poi_idx, ticket, volume, a_entry, exit_p, profit, t_status, open_h, close_h in trade_definitions:
        poi_tuple = pois[poi_idx]
        poi_obj = poi_tuple[0]
        direction = TradeDirection.BUY if poi_tuple[5] == "BUY" else TradeDirection.SELL
        
        open_time = now + timedelta(hours=open_h)
        close_time = (now + timedelta(hours=close_h)) if close_h else None
        
        # Calculate R
        entry_d = Decimal(str(a_entry))
        sl_d = poi_obj.stop_loss
        risk = abs(float(entry_d) - float(sl_d))
        
        r_mul = None
        pips = None
        net_profit = None
        
        if exit_p is not None and risk > 0:
            if direction == TradeDirection.BUY:
                r_mul = (exit_p - a_entry) / risk
                pips = (exit_p - a_entry) * (100 if "JPY" in poi_obj.symbol else 10000)
            else:
                r_mul = (a_entry - exit_p) / risk
                pips = (a_entry - exit_p) * (100 if "JPY" in poi_obj.symbol else 10000)
            commission = -abs(profit or 0) * 0.002
            net_profit = profit + commission if profit else None

        trade = Trade(
            poi_id=str(poi_obj.id),
            account_id=str(main_acc.id),
            mt5_ticket=ticket,
            symbol=poi_obj.symbol,
            direction=direction,
            volume=Decimal(str(volume)),
            entry_price=entry_d,
            stop_loss=poi_obj.stop_loss,
            take_profit=poi_obj.take_profit,
            current_price=Decimal(str(a_entry + 0.005)) if t_status == "OPEN" else None,
            exit_price=Decimal(str(exit_p)) if exit_p else None,
            profit=Decimal(str(profit)) if profit else None,
            commission=Decimal(str(round(-(abs(profit or 0) * 0.002), 2))) if profit else None,
            swap=Decimal("0.00"),
            net_profit=Decimal(str(round(net_profit, 2))) if net_profit else None,
            risk_amount=Decimal(str(round(risk * volume * 10, 2))),
            r_multiple=Decimal(str(round(r_mul, 2))) if r_mul else None,
            pips=Decimal(str(round(pips, 1))) if pips else None,
            status=TradeStatus.OPEN if t_status == "OPEN" else TradeStatus.CLOSED,
            opened_at=utc(open_time),
            closed_at=utc(close_time) if close_time else None,
            idempotency_key=f"seed_trade_{ticket}",
        )
        session.add(trade)
        trades.append(trade)

    await session.flush()

    # ─── Trade Journals ────────────────────────────────────────────────────────
    journal_data = [
        (1, "Clean NAS100 setup on H1. Entered on retest of OB. Target hit within 4 hours. Perfect execution.",
         ["clean_setup", "london_session", "h1"], 5, "Always wait for the retest."),
        (2, "Good EURUSD M15 setup. Slight hesitation at entry but held. Solid +2.5R result.",
         ["m15", "eurusd", "patience"], 4, "Trust the setup, don't move SL."),
        (3, "GBPUSD SL hit. Volatility around news event. Should have avoided trading during high-impact news.",
         ["news_trap", "gbpusd", "lesson"], 2, "Check the economic calendar before every trade."),
    ]
    for i, (trade_idx, notes, tags, rating, lessons) in enumerate(journal_data):
        if trade_idx < len(trades) and trades[trade_idx].status == TradeStatus.CLOSED:
            journal = TradeJournal(
                trade_id=str(trades[trade_idx].id),
                user_id=str(user.id),
                notes=notes,
                tags=tags,
                rating=rating,
                setup_quality=rating,
                lessons=lessons,
            )
            session.add(journal)

    # ─── Events log ───────────────────────────────────────────────────────────
    for poi_tuple in pois[:4]:
        poi_obj = poi_tuple[0]
        event = Event(
            account_id=str(main_acc.id),
            ea_id=str(ea_main.id),
            poi_id=str(poi_obj.id),
            type=EventType.POI_CREATED,
            payload={"symbol": poi_obj.symbol, "direction": poi_obj.direction.value, "status": poi_obj.status.value},
            created_at=poi_obj.created_at,
        )
        session.add(event)

    await session.commit()
    logger.info(
        "Demo data seeded: user=demo@mt5app.com, accounts=2, eas=2, pois=%d, trades=%d",
        len(pois), len(trades),
    )


async def seed_demo_data_entrypoint():
    """Entrypoint for CLI seeding."""
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await seed_demo_data(session)


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_demo_data_entrypoint())
