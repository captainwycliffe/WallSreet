# MT5 Trade Monitor — Project Status & Gap Analysis

**Generated:** 2026-08-28
**Method:** static read of every source file in the repo; imports, routes, and type contracts cross-checked between `backend/` and `mobile/`. Nothing was executed — runtime-only issues are marked **[likely]** rather than confirmed.

---

## TL;DR

The **foundation is broadly built** — 7 backend model files, 4 repositories, 5 services, 6 API routers, a full WebSocket manager, an event bus, a 12KB demo seeder, a 20KB MT5 simulator, a 14KB MQL5 adapter, and the mobile app's entire type/hook/component/store layer all exist and look coherent.

Two things are unfinished, and they're both mid-sentence:

1. **The backend cannot start.** Two hard `ImportError`s on module load / first request. `backend/app/api/router.py:9` says it out loud: *"These routers will be created shortly."* Four routers plus one service were never written.
2. **The mobile app is a shell.** 4 of 5 tab screens render a centered title and nothing else, even though every hook, card, and type they'd need is already written and sitting unused.

There is also a **third, quieter problem**: even after the backend boots, the mobile app will not talk to it. Every endpoint path is wrong (missing `/api` prefix) and several response shapes don't match the TypeScript types. Details in [§3](#3-backend--mobile-contract-mismatches).

---

## 1. Hard blockers — backend will not boot

| # | Problem | Location | Detail |
|---|---|---|---|
| 1 | `ImportError` on app import | `backend/app/api/router.py:13` | `from app.websocket.router import router as ws_router` — but `websocket/router.py:16` only defines **`ws_router`**. There is no name `router` in that module. Raised at `create_app()` → i.e. at `import app.main`, so **uvicorn dies immediately**. |
| 2 | `ImportError` on startup | `backend/app/main.py:49` | `from app.services.ea_service import ea_service` — **`app/services/ea_service.py` does not exist.** Raised inside `lifespan`, so the process starts then dies during boot. |

**#1 is the very first thing to fix** — nothing else is reachable until it is. Fix is one word (`ws_router`), or add an alias in `websocket/router.py`.

**#2 needs a real module.** `ea_service` must expose at minimum an `ea_service` singleton with an awaitable `run_offline_monitor()`. The supporting pieces already exist to build it: `EARegistration` model (`models/account.py:33`), `EARegistrationStatus`, and the config knobs `EA_HEARTBEAT_TIMEOUT_SECONDS` / `EA_OFFLINE_ALERT_AFTER_SECONDS` (`core/config.py`).

---

## 2. Missing backend modules

All four are already imported-and-commented in `api/router.py:9-12` and `:23-26` — uncommenting them is the last step, not the first.

| Module | Status | What it needs | Groundwork that already exists |
|---|---|---|---|
| `app/services/ea_service.py` | **missing** | `ea_service` singleton + `run_offline_monitor()` background loop; heartbeat → ONLINE/OFFLINE transitions | `EARegistration` model, `publish_ea_event()` in `websocket/events.py`, `/mt5/heartbeat` route in `api/mt5.py:16` |
| `app/api/ea.py` | **missing** | `GET /ea/monitor` (mobile calls it), EA register/list/revoke | `EAResponse` + `EACreate` schemas already written in `schemas/account.py:17-31` |
| `app/api/risk.py` | **missing** | `GET /risk/dashboard` (mobile calls it) | **`services/risk_service.py` is fully implemented** — this router is a thin wrapper over `RiskService.get_risk_dashboard()` |
| `app/api/journal.py` | **missing** | CRUD for trade journal entries | `TradeJournal` model + `schemas/journal.py` both exist |
| `app/api/notifications.py` | **missing** | push-token register/unregister, notification history | `PushToken` + `NotificationLog` models exist in `models/notification.py` |
| `app/notifications/` (package) | **missing** | Expo push sender using `EXPO_ACCESS_TOKEN` | Config key exists; README §Key Features advertises this |

### Missing endpoints the mobile app already calls

`mobile/services/api.ts` calls 8 endpoints. **3 have no backend route at all:**

| Mobile call | Backend route | Status |
|---|---|---|
| `/auth/login` | `api/auth.py:16` | exists |
| `/auth/register` | `api/auth.py:11` | exists |
| `/accounts` | `api/accounts.py:13` | exists |
| `/analytics/metrics` | `api/analytics.py:14` | exists |
| `/users/me` | — | **wrong path** — backend has `/auth/me` (`api/auth.py:40`) |
| `/analytics/equity-curve` | — | **missing** (only `/metrics` implemented; `analytics/equity.py` helper exists) |
| `/risk/dashboard` | — | **missing router** (service is done) |
| `/ea/monitor` | — | **missing router** |

Also unreachable, called by mobile service functions: `getTrade(id)` → **`GET /trades/{id}` doesn't exist** (only the list route), and `getAccount(id)` → **`GET /accounts/{id}` doesn't exist**.

---

## 3. Backend ↔ mobile contract mismatches

These are the bugs that will bite *after* the backend boots. All verified by reading both sides.

### 3a. Every mobile request will 404 — `/api` prefix

`main.py:100` mounts everything under a prefix:

```python
app.include_router(api_router, prefix="/api")   # → /api/auth/login, /api/pois, ...
```

But `mobile/services/api.ts` sets `baseURL = API_URL` and calls bare paths (`/auth/login`, `/accounts`, `/pois`). **Nothing lines up.** Pick one:
- set `EXPO_PUBLIC_API_URL=http://localhost:8000/api` in `mobile/.env`, **or**
- drop the `prefix="/api"` in `main.py:100`.

Note the token-refresh interceptor (`api.ts:35`) hardcodes `${API_URL}/auth/refresh` separately — it must be fixed to match whichever option you choose.

### 3b. List responses — `data` vs `items`

| Side | Shape |
|---|---|
| Backend `POIListResponse` / `TradeListResponse` | `{ data: [...], total: int }` |
| Mobile `PaginatedResponse<T>` (`types/api.ts:2`) | `{ items: T[], total, page, pages }` |

`usePOIs`/`useTrades` read `.items`, so lists render **empty** even on a 200. The mock fallbacks in those hooks return the correct `{items,...}` shape — which is exactly why the stub screens would look fine on mock data and break on real data. Backend has **no pagination fields at all** (`page`/`pages`).

### 3c. Analytics metrics — field names diverge

| Mobile `AnalyticsMetrics` expects | Backend `MetricsResponse` provides |
|---|---|
| `total_pl`, `total_net_pl` | `total_net_profit` |
| `winning_trades`, `losing_trades` | *(absent)* |
| `max_drawdown` | `max_drawdown` — but **hardcoded `0.0`** at `api/analytics.py:31` |
| *(n/a)* | `best_trade`, `worst_trade` (extra) |

### 3d. Risk dashboard — almost entirely different objects

| Mobile `RiskDashboard` (`types/risk.ts`) | Backend `RiskDashboardResponse` (`schemas/risk.py`) |
|---|---|
| `daily_risk_pct`, `daily_pl`, `daily_drawdown_pct`, `max_drawdown_pct`, `total_exposure_pct`, `risk_per_trade_pct` | `current_drawdown_pct`, `daily_trades_count`, `is_trading_allowed` |
| `open_risk_pct` | `open_risk_pct` — only field in common |
| `limits: { daily_risk_limit_pct, max_drawdown_pct, risk_per_trade_pct }` | `limits: { max_daily_drawdown_pct, max_open_risk_pct, max_trades_per_day }` |

Also: `risk_service.py:31` emits `severity="CRITICAL"`, but the mobile union is `'LOW' | 'MEDIUM' | 'HIGH'` — `CRITICAL` isn't a valid value on the client.

Neither side matches the `.env` knobs (`DEFAULT_DAILY_RISK_LIMIT_PCT`, `DEFAULT_MAX_DRAWDOWN_PCT`, `DEFAULT_RISK_PER_TRADE_PCT`) — `RiskLimits` in `schemas/risk.py` hardcodes its own defaults instead of reading `settings`.

### 3e. Chart point shapes

| Mobile | Backend |
|---|---|
| `EquityPoint { date, equity, balance }` | `EquityPoint { timestamp, equity }` — no `date`, no `balance` |
| `DailyPLPoint { date, pl, cumulative }` | `DailyPLPoint { date, pl, cumulative_pl }` |

### 3f. Smaller ones

- **POI metadata:** mobile `POI.metadata`; backend `POICreate.metadata_data` and `POIResponse` **omits it entirely**.
- **Nested objects:** mobile `POI.trade?`, `Trade.poi?`, `Trade.journal?` are never populated — the backend response schemas are flat, and both ORM relationships are **commented out** (`models/account.py:31`, `models/journal.py:16`).
- **`ea_registrations`:** mobile `MT5Account.ea_registrations` is required, but `AccountResponse` (`schemas/account.py:33`) doesn't include it → always `undefined`.
- **Required query params:** `GET /pois`, `/trades`, `/analytics/metrics` all take `account_id` as a **required** param. Mobile passes filters optionally (`usePOIs()` with no args) → **HTTP 422**, which the hooks silently swallow into mock data.

---

## 4. Mobile app — 4 of 5 screens are placeholders

Everything below `app/` is scaffolded; the screens themselves are not.

| Screen | Current state | Ready-made pieces sitting unused |
|---|---|---|
| `app/(tabs)/index.tsx` (Dashboard) | **partial** — account card is real, but ends in a `"Dashboard data loading..."` placeholder | **`AccountSummary` and `POISummary` are fully written and never imported anywhere** |
| `app/(tabs)/pois/index.tsx` | **stub** — centered "POIs" text | `usePOIs`, `POICard`, `EmptyState`, `StatusBadge` |
| `app/(tabs)/trades/index.tsx` | **stub** — centered "Trades" text | `useTrades`, `TradeCard` (incl. TP progress bar), `EmptyState` |
| `app/(tabs)/analytics/index.tsx` | **stub** — centered "Analytics" text | `useAnalyticsMetrics`, `MetricCard`, `victory-native` (in deps, never imported) |
| `app/(tabs)/more/index.tsx` | **stub** — title + working logout button | `Button`, `useRiskDashboard` |

### Screens that don't exist at all

- `pois/[id].tsx` — POI detail. **`usePOI(id)` is already written for it.**
- `trades/[id].tsx` — trade detail + journal editor. **`useTrade(id)` already written.**
- Risk dashboard screen — **`useRiskDashboard()` already written, never called.**
- EA monitor screen — `eaService.getMonitor()` already written, never called.
- Journal screen — `TradeJournal` type exists on both sides.
- Settings / account switcher — `accountStore` has `setActiveAccount`, never used from UI.

README §Key Features advertises all of the above.

> **Routing note:** `app/(tabs)/_layout.tsx` registers screens by explicit name (`pois/index`, `trades/index`, …). Dropping `[id].tsx` into those folders will make Expo Router surface them as **extra tabs** unless you add `<Tabs.Screen name="pois/[id]" options={{ href: null }} />` (or restructure into nested stacks).

### Unused / dead mobile code worth knowing about

- `components/dashboard/AccountSummary.tsx`, `components/dashboard/POISummary.tsx` — written, zero imports.
- `hooks/useHaptics.ts`, `hooks/useNetworkStatus.ts`, `components/common/OfflineBanner.tsx`, `LoadingSkeleton`, `ErrorState` — written, near-zero imports.
- `store/offlineStore.ts`, `store/wsStore.ts` — written, not wired to UI.
- `services/notifications.ts` — written; backend counterpart missing (§2).
- `mobile/features/` — **directory doesn't exist**, though `tailwind.config.js:3` globs it. Harmless, but the intended structure per README is unbuilt.

---

## 5. Wiring that exists but is never activated

| Thing | Location | Problem |
|---|---|---|
| **Event-bus handlers** | `events/handlers.py:18` | `register_handlers()` is **defined and never called anywhere** (grep: 1 hit, the definition). So `POI_CREATED` / `POSITION_OPENED` are never subscribed → **published events never reach WebSocket clients**. Real-time updates are silently dead. Call it in `main.py`'s `lifespan`. |
| **WebSocket router double-mount** | `main.py:101` + `api/router.py:27` | `ws_router` is included **twice** — once inside `api_router` (→ `/api/ws/{user_id}`) and once directly (→ `/ws/{user_id}`). Only the second matches `mobile/.env`'s `EXPO_PUBLIC_WS_URL`. Remove line 27. |
| **Analytics `max_drawdown`** | `api/analytics.py:31` | hardcoded `0.0`; `analytics/equity.py` exists to compute it properly |
| **ORM relationships** | `models/account.py:31`, `models/journal.py:16` | both `relationship()` calls commented out — blocks nested responses (§3f) |

---

## 6. Infrastructure & tooling gaps

| # | Problem | Impact |
|---|---|---|
| 1 | **`backend/app/db/migrations/` is completely empty** — no `env.py`, no `script.py.mako`, no `versions/` | `alembic.ini` points at it and `docker-compose.yml` runs `alembic upgrade head` as the **first command** of the backend container → **container fails to start**. Currently masked only because `main.py:38` does `Base.metadata.create_all` instead. |
| 2 | **`scripts/` directory is empty** | `docker-compose.yml:16` mounts `./scripts/init_db.sql` into the Postgres init hook. Docker will create a **directory** at that path instead of a file — Postgres init silently does nothing. README also promises "setup and utility scripts". |
| 3 | **`backend/tests/` has only `conftest.py`** | README §Running tests advertises `pytest tests/test_auth.py` and `pytest tests/ -k "idempotency"`. **Zero test files exist.** Also `conftest.py:22` uses the deprecated `AsyncClient(app=app)` form, which fails on httpx ≥ 0.28 (pinned at 0.27.2, so OK for now). |
| 4 | **No jest config in mobile** | `package.json` has `jest` + `jest-expo` deps and a `test` script, but **no `jest` key and no `jest.config.js`**, and no test files. README's `npx jest` will not run. `jest-expo` preset is never referenced. |
| 5 | **`alembic.ini:6` hardcodes SQLite** | `sqlalchemy.url = sqlite+aiosqlite:///./mt5_monitor.db` — contradicts the Postgres `DATABASE_URL`. Should read from env/settings. |
| 6 | **`ALLOWED_ORIGINS` parsing** **[likely]** | `.env.example:12` is comma-separated; `config.py:12` types it as `List[str]`. pydantic-settings v2 JSON-parses complex types → a comma string raises **`ValidationError` on settings load** once you `cp .env.example .env`. Needs a JSON array in `.env` or a custom validator. |
| 7 | `CORS_ALLOW_ALL` default disagrees with `.env.example` | `config.py:13` defaults `True`; `.env.example:54` says `false`. Insecure-by-default if `.env` is absent. |
| 8 | `LOG_FORMAT` in `.env.example:51` has no `Settings` field | Harmless (`extra="ignore"`), but it's silently dropped. |
| 9 | `backend/generate_backend.py` (5KB) is a one-shot scaffolding script, still in the tree | It **overwrites** files under `backend/` from an embedded dict. Re-running it now would clobber hand-edited work — worth deleting or moving out. |
| 10 | Not a git repository | No history, no branches, no rollback. Everything here is uncommitted. |

---

## 7. What's actually done — don't rebuild these

So the next session doesn't redo finished work:

**Backend (solid):**
- All 7 model files — `user`, `account` (+`EARegistration`), `poi`, `trade`, `journal`, `notification`, `event`
- All 4 repositories; `db/base.py` mixins; `db/session.py`
- `services/`: `auth`, `poi`, `trade`, `risk`, `analytics` — all implemented
- `api/`: `auth` (register/login/refresh/logout/me), `mt5` (heartbeat, poi, position open/update/close, config), `pois` (list/get/patch), `trades` (list), `accounts` (list/create), `analytics` (metrics)
- `websocket/manager.py` (9KB — connection registry + Redis pub/sub), `websocket/events.py`, `websocket/router.py` (JWT-authenticated, account-scoped)
- `events/bus.py`; `analytics/metrics.py` + `analytics/equity.py`
- `core/`: `config`, `security`, `dependencies`, `exceptions`, `logging`
- `db/seed.py` (12KB demo seeder)

**MT5 side (solid):**
- `mt5/EA/MT5_Adapter.mqh` (14KB) + `MT5_Adapter.mq5`
- `mt5/simulator/main.py` (20KB event generator)
- `docs/MT5_INTEGRATION.md` (8KB)

**Mobile (infrastructure solid, screens not):**
- All 8 type files; all 7 hooks; all 4 Zustand stores
- `services/`: `api` (axios + JWT refresh interceptor), `websocket`, `storage` (SecureStore), `notifications`, `mockData`
- `components/`: `ui/` (Button, Card, MetricCard, StatusBadge), `common/` (EmptyState, ErrorState, LoadingSkeleton, OfflineBanner), `poi/POICard`, `trade/TradeCard`, `dashboard/` (AccountSummary, POISummary)
- Working auth flow: `app/(auth)/login.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`
- `tailwind.config.js` — full dark trading theme (bg `#0A0A0F`, green `#00C896`, red `#FF4757`)

**Infra:** `docker-compose.yml` (postgres + redis + backend + demo simulator profile, healthchecks wired), both Dockerfiles, `.env.example`, `README.md`.

---

## 8. Suggested order of work

Ordered so each step is verifiable before the next.

### Phase 1 — make it boot (small, unblocks everything)
- [ ] Fix `api/router.py:13` → import `ws_router`, not `router`
- [ ] Remove the duplicate `api_router.include_router(ws_router)` at `api/router.py:27`
- [ ] Write `app/services/ea_service.py` (singleton + `run_offline_monitor()`)
- [ ] Call `register_handlers()` in `main.py`'s `lifespan` — turns real-time on
- [ ] Verify: `python -c "import app.main"` then `uvicorn app.main:app`

### Phase 2 — the four missing routers
- [ ] `api/risk.py` (thin — service is done) → uncomment `router.py:24`
- [ ] `api/ea.py` — `GET /ea/monitor` + register/revoke → uncomment `:25`
- [ ] `api/journal.py` — CRUD → uncomment `:23`
- [ ] `api/notifications.py` + `app/notifications/expo.py` → uncomment `:26`
- [ ] Add the missing detail routes: `GET /trades/{id}`, `GET /accounts/{id}`, `GET /analytics/equity-curve`
- [ ] Verify: every path in `mobile/services/api.ts` appears in `/docs`

### Phase 3 — fix the contract (do this *before* building screens)
Otherwise the screens get written against mock shapes and break on real data.
- [ ] Decide the `/api` prefix question (§3a) and fix both `baseURL` **and** the refresh interceptor
- [ ] Align list responses: `data` → `items`, add `page`/`pages` (§3b)
- [ ] Align `MetricsResponse`, `RiskDashboardResponse`, `EquityPoint`, `DailyPLPoint` (§3c–3e)
- [ ] Rename `/users/me` → `/auth/me` on the client, or add the alias route
- [ ] Make `account_id` optional server-side (default to the user's active account) — kills the silent 422s
- [ ] Add `CRITICAL` to the mobile severity union, or stop emitting it
- [ ] Point `RiskLimits` at `settings.DEFAULT_*` instead of hardcoded values

### Phase 4 — build the screens
- [ ] Finish Dashboard — import the already-written `AccountSummary` + `POISummary`
- [ ] POIs list (status filters) + `pois/[id]`
- [ ] Trades list (open/closed) + `trades/[id]` with journal editor
- [ ] Analytics (metrics grid + equity curve via `victory-native`)
- [ ] More → risk dashboard, EA monitor, settings, account switcher
- [ ] Add `href: null` Tabs.Screen entries for the `[id]` routes

### Phase 5 — infra & tests
- [ ] `alembic init` into `app/db/migrations/`, make `alembic.ini` read `DATABASE_URL`, generate `0001_initial`
- [ ] Write `scripts/init_db.sql` (or drop the compose mount)
- [ ] Backend tests: auth, MT5 idempotency, risk, EA heartbeat (the ones the README claims)
- [ ] Mobile: add the `jest-expo` preset config + first component tests
- [ ] Fix `ALLOWED_ORIGINS` parsing; flip `CORS_ALLOW_ALL` default to `False`
- [ ] Delete or relocate `backend/generate_backend.py` before it clobbers something
- [ ] `git init` + first commit

---

## Rough scale

| Area | Files to create | Files to edit |
|---|---|---|
| Phase 1 | 1 | 2 |
| Phase 2 | 6 | 4 |
| Phase 3 | 0 | ~8 |
| Phase 4 | 6–8 | 2 |
| Phase 5 | ~10 | 4 |

Phases 1–2 are the ones that turn a non-booting backend into a running one.
