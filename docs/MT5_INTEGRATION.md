# MT5 Integration Guide

This guide explains how to integrate your MT5 Expert Advisor with the MT5 Trade Monitor backend.

---

## Overview

The integration works via a secure REST API. Your EA sends events to the backend, which stores them and broadcasts real-time updates to the mobile app.

```
Your EA                           Backend
  │                                  │
  ├──── POST /api/mt5/heartbeat ────→ │ (every 30s)
  ├──── POST /api/mt5/poi ──────────→ │ (when POI detected)
  ├──── POST /api/mt5/position/open →  │ (when trade opens)
  ├──── POST /api/mt5/position/update→ │ (on price change)
  └──── POST /api/mt5/position/close → │ (when trade closes)
```

---

## Step 1: Register Your EA

### Via Mobile App
1. Open the app → **More** → **Accounts**
2. Tap your account → **Add EA**
3. Enter an EA name (e.g. "Main ICT EA")
4. Tap **Generate API Key**
5. Copy the API key shown — **this is shown once**

### Via API (curl)
```bash
curl -X POST http://your-backend:8000/api/accounts/{account_id}/ea \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Main ICT EA"}'
```

Response:
```json
{
  "id": "ea_uuid",
  "name": "Main ICT EA",
  "api_key": "mt5ea_abc123...",
  "account_id": "account_uuid"
}
```

Store the `api_key` — you'll need it in your EA's input parameters.

---

## Step 2: Add Adapter to Your EA

### Option A: Include the adapter header (recommended)

Copy `mt5/EA/MT5_Adapter.mqh` to your MQL5 Experts folder.

In your EA:
```mql5
#include "MT5_Adapter.mqh"

input string EA_API_KEY    = "mt5ea_your_key_here";
input string BACKEND_URL   = "https://your-backend.com";

CMT5Adapter *g_adapter;

int OnInit()
{
   g_adapter = new CMT5Adapter(EA_API_KEY, BACKEND_URL);
   g_adapter.Initialize();
   
   // ... your existing OnInit code ...
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(g_adapter) { g_adapter.OnDeinit(); delete g_adapter; }
   // ... your existing OnDeinit code ...
}

void OnTick()
{
   g_adapter.OnTick();  // Handles heartbeat + position updates
   // ... your existing OnTick code ...
}

// When your EA detects a POI:
string poi_id = g_adapter.ReportPOI(
   "EURUSD", "M15", "BUY",
   1.08500,  // entry
   1.08300,  // SL
   1.08900   // TP
);

// When your EA opens a trade:
g_adapter.ReportPositionOpen(ticket, poi_id, "EURUSD", "BUY", 0.1, 1.08512, 1.08300, 1.08900);

// When your EA's position closes:
g_adapter.ReportPositionClose(ticket, 1.08900, 200.00, -2.00, 0.0, "TP_HIT");
```

### Option B: Raw HTTP calls

If you prefer to make HTTP calls directly, see the API reference below.

---

## Step 3: Allow WebRequests in MT5

In MetaTrader 5:
1. **Tools** → **Options** → **Expert Advisors**
2. Enable **"Allow WebRequest for listed URL"**
3. Add your backend URL: `https://your-backend.com`

---

## API Reference

All MT5 EA endpoints require the header:
```
X-API-Key: mt5ea_your_api_key_here
```

---

### POST /api/mt5/heartbeat

Send every 30 seconds. The backend marks the EA as OFFLINE after 120 seconds without a heartbeat.

**Request:**
```json
{
  "timestamp": "2026-08-28T12:00:00Z",
  "version": "1.4.2",
  "account_balance": 10000.00,
  "account_equity": 10220.00,
  "open_positions": 1
}
```

**Response:** `200 OK`
```json
{ "status": "ok" }
```

---

### POST /api/mt5/poi

Report a newly detected Point of Interest.

**Request:**
```json
{
  "idempotency_key": "poi_unique_key_abc123",
  "symbol": "EURUSD",
  "timeframe": "M15",
  "direction": "BUY",
  "poi_type": "ORDER_BLOCK",
  "entry_price": 1.08500,
  "stop_loss": 1.08300,
  "take_profit": 1.08900,
  "zone_high": 1.08550,
  "zone_low": 1.08450,
  "risk_reward": 2.0,
  "metadata": {
    "session": "London",
    "signal_strength": 85
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "poi_uuid",
  "status": "PENDING",
  "symbol": "EURUSD",
  ...
}
```

> **Important**: Always use a unique `idempotency_key`. If MT5 retries the same event, the backend will return the existing POI without creating a duplicate.

---

### POST /api/mt5/position/open

Report when a trade opens.

**Request:**
```json
{
  "idempotency_key": "pos_open_123456789",
  "poi_id": "poi_uuid",
  "ticket": 123456789,
  "symbol": "EURUSD",
  "direction": "BUY",
  "volume": 0.10,
  "entry_price": 1.08512,
  "stop_loss": 1.08300,
  "take_profit": 1.08900,
  "opened_at": "2026-08-28T10:30:00Z"
}
```

**Response:** `201 Created`

---

### POST /api/mt5/position/update

Send on price updates (e.g. every OnTick or every 5 seconds).

**Request:**
```json
{
  "ticket": 123456789,
  "current_price": 1.08650,
  "unrealized_profit": 138.00,
  "timestamp": "2026-08-28T11:00:00Z"
}
```

**Response:** `200 OK`

---

### POST /api/mt5/position/close

Report when a trade closes (TP, SL, or manual).

**Request:**
```json
{
  "idempotency_key": "pos_close_123456789",
  "ticket": 123456789,
  "exit_price": 1.08900,
  "profit": 388.00,
  "commission": -2.00,
  "swap": 0.00,
  "closed_at": "2026-08-28T14:15:00Z",
  "close_reason": "TP_HIT"
}
```

`close_reason` options: `TP_HIT`, `SL_HIT`, `MANUAL`, `EA`

**Response:** `200 OK`

---

### GET /api/mt5/config

Retrieve the configuration your EA should use (risk limits, etc.)

**Response:**
```json
{
  "heartbeat_interval": 30,
  "max_risk_per_trade_pct": 1.0,
  "daily_risk_limit_pct": 5.0
}
```

---

## Event Flow

### POI → Trade → Close

```
1. EA detects POI
   └─ POST /api/mt5/poi → POI created (status: PENDING)
   └─ Mobile receives: POI_CREATED event via WebSocket

2. EA triggers entry
   └─ POST /api/mt5/position/open → Trade created
   └─ POI status → ACTIVE
   └─ Mobile receives: POSITION_OPENED event

3. Price moves
   └─ POST /api/mt5/position/update (every 5s)
   └─ Mobile receives: POSITION_UPDATED event
   └─ Trade card P/L + R multiple updates in real-time

4. TP hit
   └─ POST /api/mt5/position/close (close_reason: TP_HIT)
   └─ POI status → TP_HIT
   └─ Trade status → CLOSED
   └─ Mobile receives: TP_HIT event
   └─ Push notification sent: "EURUSD BUY hit Take Profit +2.0R"
   └─ Journal entry auto-created
   └─ Analytics updated
```

---

## Security

### API Key
- Keys are stored as bcrypt hashes in the database
- Include in every request as: `X-API-Key: mt5ea_...`
- Rate limited: 120 requests/minute per key
- Keys can be revoked via the Accounts screen

### HTTPS
Always use HTTPS in production. The backend validates the request origin.

### User Isolation
Each EA API key is tied to a specific MT5 account and user. It cannot access other users' data.

---

## Troubleshooting

### EA appears OFFLINE immediately
- Check that your backend URL is reachable from MT5
- Verify WebRequest is enabled in MT5 options
- Check that the API key is correct
- Look at the backend logs: `docker-compose logs backend`

### POIs not appearing in app
- Verify the EA is sending the `idempotency_key` field
- Check the backend logs for 422 validation errors
- Ensure the symbol name matches MT5 format (e.g. "EURUSD", not "EUR/USD")

### Duplicate events
- Always use a unique `idempotency_key` per POI/trade
- Good key format: `poi_{uuid4}` or `pos_open_{ticket}`
- The backend will return the existing record if the same key is sent twice

---

## Providing Your Existing EA

When you provide your existing `.mq5` EA source:

1. I will analyze the EA to identify:
   - How POIs are detected and represented
   - Entry, SL, TP calculation logic
   - Order placement and ticket handling
   - Position tracking and close detection

2. I will create a **custom adapter** that:
   - Maps your EA's internal POI data to the API format
   - Hooks into the exact points where your EA detects POIs
   - Reports positions using your EA's actual ticket/order handling
   
3. I will **NOT**:
   - Modify any trading strategy logic
   - Change entry/SL/TP calculations
   - Alter order execution behavior
   - Change any existing EA functionality

The adapter is purely additive — it adds reporting without changing trading behavior.
