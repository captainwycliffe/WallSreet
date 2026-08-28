#!/usr/bin/env python3
"""
MT5 Mock Simulator
==================
Simulates a real MT5 EA sending events to the backend for testing/demo.
Generates realistic trading scenarios without a real MT5 terminal.

Usage:
    python main.py                   # Run full scenario loop
    python main.py --scenario quick  # Run quick demo scenario
    python main.py --once poi        # Send single POI event
"""
import asyncio
import httpx
import json
import random
import uuid
import argparse
import os
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
DEMO_EMAIL = "demo@mt5app.com"
DEMO_PASSWORD = "demo1234"

# ─── Realistic Market Data ─────────────────────────────────────────────────────
SYMBOLS = {
    "EURUSD": {"pip": 0.0001, "base_price": 1.08500, "spread": 0.00012, "point_value": 10},
    "GBPUSD": {"pip": 0.0001, "base_price": 1.26500, "spread": 0.00015, "point_value": 10},
    "USDJPY": {"pip": 0.01,   "base_price": 149.500, "spread": 0.012,   "point_value": 6.7},
    "XAUUSD": {"pip": 0.01,   "base_price": 2320.00, "spread": 0.25,    "point_value": 1},
    "NAS100": {"pip": 0.1,    "base_price": 18500.0, "spread": 1.5,     "point_value": 1},
    "BTCUSD": {"pip": 1.0,    "base_price": 65000.0, "spread": 25.0,    "point_value": 1},
}

TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1"]
POI_TYPES = ["ORDER_BLOCK", "FVG", "BREAKER", "MITIGATION", "LIQUIDITY_SWEEP", "STRUCTURE"]

class MT5Simulator:
    """Simulates MT5 EA sending events to the backend."""

    def __init__(self, backend_url: str = BACKEND_URL):
        self.backend_url = backend_url
        self.access_token: Optional[str] = None
        self.ea_api_key: Optional[str] = None
        self.account_id: Optional[str] = None
        self.ea_id: Optional[str] = None
        self.active_pois: dict[str, dict] = {}     # poi_id → poi data
        self.active_trades: dict[str, dict] = {}   # ticket → trade data
        self.ticket_counter = 100000000

    # ─── Auth ───────────────────────────────────────────────────────────────────
    async def authenticate(self, client: httpx.AsyncClient) -> bool:
        """Login as demo user and get JWT token."""
        print(f"[SIM] Authenticating as {DEMO_EMAIL}...")
        try:
            resp = await client.post(f"{self.backend_url}/api/auth/login", json={
                "email": DEMO_EMAIL,
                "password": DEMO_PASSWORD,
            })
            if resp.status_code == 200:
                data = resp.json()
                self.access_token = data["access_token"]
                print("[SIM] ✓ Authenticated")
                return True
            else:
                print(f"[SIM] Auth failed: {resp.status_code} {resp.text}")
                return False
        except Exception as e:
            print(f"[SIM] Auth error: {e}")
            return False

    async def get_ea_credentials(self, client: httpx.AsyncClient) -> bool:
        """Get account ID and EA API key from backend."""
        headers = {"Authorization": f"Bearer {self.access_token}"}
        try:
            # Get accounts
            resp = await client.get(f"{self.backend_url}/api/accounts", headers=headers)
            if resp.status_code != 200:
                print(f"[SIM] Failed to get accounts: {resp.text}")
                return False

            accounts = resp.json()
            if not accounts:
                print("[SIM] No accounts found. Run seed first.")
                return False

            # Use the first non-demo account (or first if all demo)
            account = next((a for a in accounts if not a.get("is_demo")), accounts[0])
            self.account_id = account["id"]
            print(f"[SIM] Using account: {account['name']} ({self.account_id})")

            # Get EA registrations
            resp = await client.get(
                f"{self.backend_url}/api/accounts/{self.account_id}/ea",
                headers=headers,
            )
            if resp.status_code != 200:
                print(f"[SIM] Failed to get EAs: {resp.text}")
                return False

            eas = resp.json()
            if not eas:
                print("[SIM] No EAs found. Run seed first.")
                return False

            ea = eas[0]
            self.ea_id = ea["id"]
            # API key is stored in sim config (set during seed)
            # For demo we use the plaintext key from seed
            self.ea_api_key = os.getenv("SIMULATOR_EA_API_KEY", "mt5ea_demo_key_12345")
            print(f"[SIM] Using EA: {ea['name']} ({self.ea_id})")
            return True
        except Exception as e:
            print(f"[SIM] Credential error: {e}")
            return False

    # ─── EA API Calls ───────────────────────────────────────────────────────────
    def _ea_headers(self) -> dict:
        return {"X-API-Key": self.ea_api_key, "Content-Type": "application/json"}

    async def send_heartbeat(self, client: httpx.AsyncClient):
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.4.2",
            "account_balance": round(random.uniform(9800, 10200), 2),
            "account_equity": round(random.uniform(9800, 10500), 2),
            "open_positions": len(self.active_trades),
        }
        try:
            resp = await client.post(
                f"{self.backend_url}/api/mt5/heartbeat",
                json=payload,
                headers=self._ea_headers(),
            )
            if resp.status_code == 200:
                print(f"[SIM] ♥ Heartbeat sent")
            else:
                print(f"[SIM] Heartbeat failed: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"[SIM] Heartbeat error: {e}")

    async def create_poi(self, client: httpx.AsyncClient, symbol: Optional[str] = None) -> Optional[str]:
        """Send POI_CREATED event to backend."""
        symbol = symbol or random.choice(list(SYMBOLS.keys()))
        sym_data = SYMBOLS[symbol]
        direction = random.choice(["BUY", "SELL"])
        base = sym_data["base_price"] + random.uniform(-0.005 * sym_data["base_price"], 0.005 * sym_data["base_price"])
        pip = sym_data["pip"]

        if direction == "BUY":
            entry = round(base, 5)
            sl = round(entry - random.randint(15, 50) * pip, 5)
            tp = round(entry + random.randint(30, 120) * pip, 5)
        else:
            entry = round(base, 5)
            sl = round(entry + random.randint(15, 50) * pip, 5)
            tp = round(entry - random.randint(30, 120) * pip, 5)

        zone_range = random.randint(5, 15) * pip
        zone_high = round(entry + zone_range, 5)
        zone_low = round(entry - zone_range, 5)

        risk = abs(entry - sl)
        reward = abs(entry - tp)
        rr = round(reward / risk, 2) if risk > 0 else 2.0
        idempotency_key = f"poi_{uuid.uuid4().hex}"

        payload = {
            "idempotency_key": idempotency_key,
            "symbol": symbol,
            "timeframe": random.choice(TIMEFRAMES),
            "direction": direction,
            "poi_type": random.choice(POI_TYPES),
            "entry_price": entry,
            "stop_loss": sl,
            "take_profit": tp,
            "zone_high": zone_high,
            "zone_low": zone_low,
            "risk_reward": rr,
            "metadata": {
                "session": random.choice(["London", "NY", "Tokyo", "Sydney"]),
                "signal_strength": random.randint(60, 95),
                "strategy": "ICT_POI",
            },
        }

        try:
            resp = await client.post(
                f"{self.backend_url}/api/mt5/poi",
                json=payload,
                headers=self._ea_headers(),
            )
            if resp.status_code in (200, 201):
                poi = resp.json()
                poi_id = poi["id"]
                self.active_pois[poi_id] = {**payload, "id": poi_id, "entry": entry, "sl": sl, "tp": tp, "direction": direction, "symbol": symbol}
                print(f"[SIM] 📍 POI created: {symbol} {direction} @ {entry} (ID: {poi_id[:8]}...)")
                return poi_id
            else:
                print(f"[SIM] POI creation failed: {resp.status_code} {resp.text}")
                return None
        except Exception as e:
            print(f"[SIM] POI creation error: {e}")
            return None

    async def open_position(self, client: httpx.AsyncClient, poi_id: str) -> Optional[int]:
        """Simulate position open event."""
        if poi_id not in self.active_pois:
            return None

        poi = self.active_pois[poi_id]
        ticket = self.ticket_counter
        self.ticket_counter += 1
        sym_data = SYMBOLS.get(poi["symbol"], SYMBOLS["EURUSD"])
        slippage = random.uniform(-2, 5) * sym_data["pip"]
        actual_entry = round(poi["entry"] + slippage, 5)

        payload = {
            "idempotency_key": f"pos_open_{ticket}",
            "poi_id": poi_id,
            "ticket": ticket,
            "symbol": poi["symbol"],
            "direction": poi["direction"],
            "volume": round(random.choice([0.01, 0.02, 0.05, 0.1, 0.2]), 2),
            "entry_price": actual_entry,
            "stop_loss": poi["sl"],
            "take_profit": poi["tp"],
            "opened_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            resp = await client.post(
                f"{self.backend_url}/api/mt5/position/open",
                json=payload,
                headers=self._ea_headers(),
            )
            if resp.status_code in (200, 201):
                self.active_trades[str(ticket)] = {
                    **payload, "current_price": actual_entry, "poi_data": poi,
                }
                print(f"[SIM] 📈 Position OPENED: {poi['symbol']} {poi['direction']} @ {actual_entry} (Ticket: {ticket})")
                return ticket
            else:
                print(f"[SIM] Position open failed: {resp.status_code} {resp.text}")
                return None
        except Exception as e:
            print(f"[SIM] Position open error: {e}")
            return None

    async def update_position(self, client: httpx.AsyncClient, ticket: int, current_price: float):
        """Send position update (price tick)."""
        trade = self.active_trades.get(str(ticket))
        if not trade:
            return
        trade["current_price"] = current_price
        payload = {
            "ticket": ticket,
            "current_price": current_price,
            "unrealized_profit": round(random.uniform(-200, 500), 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            resp = await client.post(
                f"{self.backend_url}/api/mt5/position/update",
                json=payload,
                headers=self._ea_headers(),
            )
            if resp.status_code == 200:
                print(f"[SIM] 📊 Price update: Ticket {ticket} @ {current_price}")
        except Exception as e:
            print(f"[SIM] Update error: {e}")

    async def close_position(
        self,
        client: httpx.AsyncClient,
        ticket: int,
        reason: str = "TP_HIT",
    ) -> bool:
        """Simulate position close event."""
        trade = self.active_trades.get(str(ticket))
        if not trade:
            return False

        poi = trade.get("poi_data", {})
        direction = trade.get("direction", "BUY")
        entry = trade.get("entry_price", 0)
        sym_data = SYMBOLS.get(trade.get("symbol", "EURUSD"), SYMBOLS["EURUSD"])

        if reason == "TP_HIT":
            exit_price = trade.get("stop_loss") if False else poi.get("tp", entry)
            profit = round(abs(exit_price - entry) / sym_data["pip"] * 10 * trade.get("volume", 0.1), 2)
        elif reason == "SL_HIT":
            exit_price = poi.get("sl", entry)
            profit = -round(abs(exit_price - entry) / sym_data["pip"] * 10 * trade.get("volume", 0.1), 2)
        else:
            exit_price = trade["current_price"]
            profit = round(random.uniform(-200, 300), 2)

        payload = {
            "idempotency_key": f"pos_close_{ticket}",
            "ticket": ticket,
            "exit_price": exit_price,
            "profit": profit,
            "commission": round(-abs(profit) * 0.002, 2),
            "swap": 0.0,
            "closed_at": datetime.now(timezone.utc).isoformat(),
            "close_reason": reason,
        }

        try:
            resp = await client.post(
                f"{self.backend_url}/api/mt5/position/close",
                json=payload,
                headers=self._ea_headers(),
            )
            if resp.status_code == 200:
                emoji = "✅" if reason == "TP_HIT" else "❌"
                print(f"[SIM] {emoji} Position CLOSED: Ticket {ticket} @ {exit_price} P/L: {profit} ({reason})")
                del self.active_trades[str(ticket)]
                return True
        except Exception as e:
            print(f"[SIM] Close error: {e}")
        return False

    # ─── Scenario Runner ────────────────────────────────────────────────────────
    async def run_scenario_full_lifecycle(self, client: httpx.AsyncClient, symbol: str):
        """Complete lifecycle: POI → Open → Price updates → Close."""
        print(f"\n[SIM] ══ Starting full lifecycle scenario: {symbol} ══")

        # 1. Heartbeat
        await self.send_heartbeat(client)
        await asyncio.sleep(1)

        # 2. Create POI
        poi_id = await self.create_poi(client, symbol)
        if not poi_id:
            return
        await asyncio.sleep(random.uniform(2, 5))

        # 3. Open position (EA triggered entry)
        ticket = await self.open_position(client, poi_id)
        if not ticket:
            return

        # 4. Price updates (simulate tick data)
        trade = self.active_trades[str(ticket)]
        entry = trade["entry_price"]
        poi = trade["poi_data"]
        tp = poi.get("tp", entry * 1.002)
        sl = poi.get("sl", entry * 0.998)
        direction = poi["direction"]

        steps = random.randint(8, 20)
        will_win = random.random() < 0.6  # 60% win rate

        for i in range(steps):
            progress = (i + 1) / steps
            if will_win:
                if direction == "BUY":
                    current = entry + (tp - entry) * progress + random.uniform(-0.0003, 0.0003)
                else:
                    current = entry - (entry - tp) * progress + random.uniform(-0.0003, 0.0003)
            else:
                if direction == "BUY":
                    current = entry - (entry - sl) * progress + random.uniform(-0.0003, 0.0003)
                else:
                    current = entry + (sl - entry) * progress + random.uniform(-0.0003, 0.0003)

            current = round(max(0.001, current), 5)
            await self.update_position(client, ticket, current)
            await asyncio.sleep(random.uniform(1, 3))

        # 5. Close position
        reason = "TP_HIT" if will_win else "SL_HIT"
        await self.close_position(client, ticket, reason)

        # Heartbeat after close
        await asyncio.sleep(1)
        await self.send_heartbeat(client)

    async def run_continuous_heartbeat(self, client: httpx.AsyncClient, interval: int = 30):
        """Send heartbeat every N seconds continuously."""
        while True:
            await self.send_heartbeat(client)
            await asyncio.sleep(interval)

    async def run_demo_loop(self, client: httpx.AsyncClient, num_scenarios: int = 5):
        """Run multiple scenarios with some overlap."""
        symbols = random.sample(list(SYMBOLS.keys()), min(num_scenarios, len(SYMBOLS)))
        tasks = []
        for i, symbol in enumerate(symbols):
            delay = i * random.uniform(5, 15)  # Stagger starts
            async def run_with_delay(s=symbol, d=delay):
                await asyncio.sleep(d)
                await self.run_scenario_full_lifecycle(client, s)
            tasks.append(asyncio.create_task(run_with_delay()))
        await asyncio.gather(*tasks)

    async def run_quick_scenario(self, client: httpx.AsyncClient):
        """Quick 30-second demo scenario."""
        print("[SIM] Running quick scenario...")
        await self.send_heartbeat(client)
        poi_id = await self.create_poi(client, "EURUSD")
        if poi_id:
            await asyncio.sleep(2)
            ticket = await self.open_position(client, poi_id)
            if ticket:
                trade = self.active_trades[str(ticket)]
                entry = trade["entry_price"]
                for i in range(5):
                    current = round(entry + (i + 1) * 0.0005, 5)
                    await self.update_position(client, ticket, current)
                    await asyncio.sleep(2)
                await self.close_position(client, ticket, "TP_HIT")

    async def simulate_ea_offline(self, client: httpx.AsyncClient, offline_seconds: int = 60):
        """Simulate EA going offline then coming back online."""
        print(f"\n[SIM] Simulating EA going OFFLINE for {offline_seconds}s...")
        # Just stop sending heartbeats — backend will detect timeout
        await asyncio.sleep(offline_seconds)
        print("[SIM] EA coming back ONLINE...")
        await self.send_heartbeat(client)


# ─── Main ───────────────────────────────────────────────────────────────────────
async def main():
    parser = argparse.ArgumentParser(description="MT5 Event Simulator")
    parser.add_argument("--scenario", choices=["full", "quick", "heartbeat", "offline"], default="full")
    parser.add_argument("--num", type=int, default=3, help="Number of scenarios to run")
    parser.add_argument("--symbol", type=str, help="Specific symbol to use")
    parser.add_argument("--backend", type=str, default=BACKEND_URL, help="Backend URL")
    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════╗
║     MT5 Trade Monitor Simulator      ║
║  Backend: {args.backend:<26} ║
╚══════════════════════════════════════╝
""")

    sim = MT5Simulator(backend_url=args.backend)

    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        # Wait for backend to be ready
        print("[SIM] Waiting for backend...")
        for attempt in range(30):
            try:
                resp = await client.get(f"{args.backend}/health")
                if resp.status_code == 200:
                    print("[SIM] ✓ Backend is ready")
                    break
            except Exception:
                pass
            print(f"[SIM] Attempt {attempt + 1}/30 — backend not ready, waiting 3s...")
            await asyncio.sleep(3)
        else:
            print("[SIM] ✗ Backend not available. Exiting.")
            return

        # Authenticate
        if not await sim.authenticate(client):
            print("[SIM] ✗ Authentication failed. Is demo data seeded?")
            return

        if not await sim.get_ea_credentials(client):
            print("[SIM] ✗ Could not get EA credentials. Is demo data seeded?")
            return

        # Run scenario
        if args.scenario == "quick":
            await sim.run_quick_scenario(client)
        elif args.scenario == "heartbeat":
            await sim.run_continuous_heartbeat(client, interval=15)
        elif args.scenario == "offline":
            await sim.simulate_ea_offline(client, offline_seconds=90)
        else:
            # Full demo loop
            await sim.run_demo_loop(client, num_scenarios=args.num)

    print("\n[SIM] Simulation complete. ✓")


if __name__ == "__main__":
    asyncio.run(main())
