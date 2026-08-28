# MT5 Trade Monitor

> **"My entire MT5 trading system in my pocket."**

A production-quality mobile command center for monitoring MT5 trades, POIs, analytics, and EA health — in real-time.

---

## Architecture

```
MT5 EA (MQL5)
     │  HTTPS POST
     ▼
FastAPI Backend  ──── PostgreSQL  (persistent data)
     │           ──── Redis       (pub/sub, caching, rate limiting)
     │           ──── Event Bus   (internal async event routing)
     ▼  WebSocket
React Native Mobile App (iOS + Android)
```

The mobile app **never connects directly to MT5**. All data flows through the backend.

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20+ (for mobile)
- Python 3.12+ (for local backend dev)
- Expo CLI: `npm install -g expo-cli`

### 1. Clone and configure

```bash
git clone <repo>
cd WallSreet
cp .env.example .env
# Edit .env with your settings
```

### 2. Start backend services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379  
- FastAPI backend on port 8000

The backend automatically:
- Runs Alembic migrations
- Seeds demo data (demo@mt5app.com / demo1234)

### 3. Start the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` for iOS simulator / `a` for Android emulator.

### 4. Run the MT5 simulator (demo mode)

```bash
# Start the simulator alongside backend
docker-compose --profile demo up -d

# Or run directly
cd mt5/simulator
pip install httpx python-dotenv
python main.py --scenario quick
```

### 5. Open the app

- Login: **demo@mt5app.com** / **demo1234**
- Dashboard shows live demo data
- Simulator generates real-time events

---

## Project Structure

```
WallSreet/
├── backend/                 FastAPI backend
│   ├── app/
│   │   ├── api/             REST API routers
│   │   ├── core/            Config, security, dependencies
│   │   ├── db/              Database session, migrations, seed
│   │   ├── models/          SQLAlchemy ORM models
│   │   ├── schemas/         Pydantic request/response schemas
│   │   ├── services/        Business logic layer
│   │   ├── repositories/    Data access layer
│   │   ├── websocket/       WebSocket server + Redis pub/sub
│   │   ├── events/          Internal event bus + handlers
│   │   ├── analytics/       Metrics calculations
│   │   └── notifications/   Expo push notifications
│   └── tests/
├── mobile/                  React Native (Expo) app
│   ├── app/                 Expo Router screens
│   ├── components/          Reusable UI components
│   ├── features/            Feature-specific modules
│   ├── hooks/               React hooks
│   ├── services/            API client, WebSocket, storage
│   ├── store/               Zustand state stores
│   └── types/               TypeScript types
├── mt5/
│   ├── EA/                  MQL5 adapter files
│   └── simulator/           Mock MT5 event generator
├── docker/                  Dockerfiles
├── docs/                    Documentation
├── scripts/                 Setup and utility scripts
├── docker-compose.yml
└── .env.example
```

---

## Backend Development

### Local setup (without Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start PostgreSQL and Redis (via Docker)
docker-compose up -d postgres redis

# Run migrations
alembic upgrade head

# Seed demo data
python -m app.db.seed

# Start server
uvicorn app.main:app --reload --port 8000
```

### API Documentation

Visit http://localhost:8000/docs for interactive Swagger UI.

### Running tests

```bash
cd backend
pytest tests/ -v
pytest tests/test_auth.py -v          # Auth tests only
pytest tests/ -k "idempotency" -v    # Specific tests
```

---

## Mobile Development

### Environment

Create `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_WS_URL=ws://localhost:8000/ws
```

For a physical device, use your machine's local IP instead of `localhost`.

### Running

```bash
cd mobile
npm install
npx expo start
```

### Running tests

```bash
cd mobile
npx jest
npx jest --watch
```

---

## MT5 Integration

### Connect your EA

See [docs/MT5_INTEGRATION.md](docs/MT5_INTEGRATION.md) for full instructions.

Quick summary:
1. Register an EA via the Accounts screen → "Add EA"
2. Copy the API key shown
3. Add `MT5_Adapter.mqh` to your EA folder
4. Call the adapter from your EA's OnInit/OnTick/OnDeinit
5. Call `ReportPOI()` when you detect a POI
6. Call `ReportPositionOpen/Close()` on trade events

---

## Key Features

| Feature | Description |
|---|---|
| **Real-time Dashboard** | Balance, equity, open P/L, active trades, pending POIs |
| **POI Tracking** | Full lifecycle: DETECTED → PENDING → ACTIVE → TP/SL HIT |
| **Trade Monitoring** | Live P/L, R-multiple, progress bar toward TP |
| **Analytics** | Win rate, profit factor, equity curve, R distribution |
| **Risk Dashboard** | Daily risk, drawdown, warnings with configurable limits |
| **Trade Journal** | Auto-generated with notes, tags, ratings |
| **EA Monitor** | Heartbeat status, online/offline detection |
| **Push Notifications** | POI detected, trade opened, TP/SL hit, EA offline |
| **Multi-Account** | Support for multiple MT5 accounts |
| **Demo Mode** | Full mock simulator, no MT5 required |
| **Offline Support** | Cached data, auto-reconnect, offline banner |

---

## Default Credentials (Demo)

| Field | Value |
|---|---|
| Email | demo@mt5app.com |
| Password | demo1234 |
| Account | Main Account (FTMO) |

---

## Environment Variables

See `.env.example` for full reference. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET_KEY` | JWT signing key (keep secret) |
| `EXPO_ACCESS_TOKEN` | For push notifications |
| `DEMO_MODE` | Enable demo data seeding |

---

## Tech Stack

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL 16, Redis 7, Alembic, Pydantic v2

**Mobile:** React Native, Expo SDK 51, TypeScript, Expo Router, TanStack Query v5, Zustand, NativeWind, Victory Native

**Infrastructure:** Docker, Docker Compose, Nginx (production)

---

## Roadmap (Future)

- [ ] Telegram / Discord notifications
- [ ] Email reports
- [ ] AI trade analysis
- [ ] Backtesting integration
- [ ] Multi-user / team accounts
- [ ] Prop firm rule monitoring
- [ ] Weekly performance summaries
- [ ] Advanced charting (TradingView WebView)
