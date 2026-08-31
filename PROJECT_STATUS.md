# MT5 Trade Monitor — Project Status & Gap Analysis

**Generated:** 2026-08-28
**Updated:** 2026-08-30 — **Phase 4 (mobile screens) substantially underway**, see the newest entry [§0-c](#0-c-update-2026-08-30-later-same-day--phase-4-substantial-progress) below. Phase 3 (contract alignment) and Phases 1–2 also complete. Plan-conformance audit added as [§9](#9-conformance-against-the-original-implementation-plan).
**Method:** static read of every source file in the repo; imports, routes, and type contracts cross-checked between `backend/` and `mobile/`. Backend work (§0, §0-b) was verified by actually running the app (`TestClient` + full lifespan, real register/login/CRUD calls against a live SQLite DB, seeded trade data). Mobile work (§0-c) was verified by a real `tsc` type-check of the data-layer files, a syntax-parse of all 65 mobile TS/TSX files, and manual cross-checking of every relative import path and every component prop against its actual interface — but **not** by running Expo/Metro, since no RN runtime is available in this environment. See §0-c for exactly what that does and doesn't cover.

---

## 0-c. Update 2026-08-30 (later same day) — Phase 4 substantial progress

**What got built** — this is the first pass at Phase 4 (mobile screens), not the whole phase:

- **Registration screen** (`app/(auth)/register.tsx`) — didn't exist at all; nobody could sign up. `authStore.register()` already existed and worked, it just had no UI. Added a link from login → register too (also didn't exist).
- **All 7 "More" tab sub-screens**, previously all missing:
  - `more/risk` — real risk dashboard against Phase 3's `/risk/dashboard`, with progress bars against each configured limit and a warnings list.
  - `more/ea-monitor` — real EA status list against Phase 2's `/ea/monitor`.
  - `more/accounts` — list + inline create-account form against Phase 2's `POST /accounts`.
  - `more/notifications` — push notification history against Phase 2's `/notifications/history`.
  - `more/journal` (list of closed trades) + `more/journal/[tradeId]` (view/create/edit entry) — against Phase 2's `/journal` routes.
  - `more/settings` — includes wiring the local Expo push-permission flow (`services/notifications.ts`, existed but was never called from anywhere) to the backend's token-registration route. That's a third instance of the "built but never connected" pattern this doc keeps finding (see §5) — same shape as `ws_manager.startup()` in Phase 1 and `notification_service` itself in Phase 2.
  - `more/profile` — read-only account info (no `PATCH /auth/me` route exists on the backend to edit against, so this doesn't pretend to support editing).
  - `more/index` itself rebuilt from a bare logout button into an actual navigation hub linking to all of the above.
- **Main tab screens** — `pois/index`, `trades/index`, `analytics/index` were 3 of the "4 shells" called out in the original TL;DR. All three rebuilt against real hooks (`usePOIs`, `useTrades`, `useAnalyticsMetrics`/`useEquityCurve`) using `POICard`/`TradeCard`, which already existed fully built and were simply never used anywhere.
- **Detail routes** `pois/[id]` and `trades/[id]` — both entirely missing before. Trade detail links into the new journal entry screen.
- **Missing components built**: `Header`, `SectionHeader`, `EAStatusCard`, `AccountCard`, `NotificationCard` — all flagged missing in §9, all needed by the screens above.
- **`useRisk.ts` hook** — was missing (§9). Along the way, found and removed a duplicate `useRiskDashboard()` that had been pasted into `useAnalytics.ts` instead — same function, two homes, only one of which matched the file layout the original plan specified.
- **Equity curve chart** — `victory-native` v41 is in `package.json`, but its Skia-based Cartesian-chart API is large and version-specific enough that it couldn't be verified working without a real Metro bundle. Built a lightweight bar-based sparkline out of plain `View`s instead — guaranteed to render, if visually simpler. Swapping in real `victory-native` charts is a reasonable follow-up once someone can run the app to check it.
- **Routing fix caught before it shipped**: adding `pois/[id]`, `trades/[id]`, and all 7 `more/*` sub-screens as flat files under the `(tabs)` group would have made Expo Router's `<Tabs>` navigator treat every one of them as its own top-level tab — exploding the tab bar from 5 tabs to 15+. Added `pois/_layout.tsx`, `trades/_layout.tsx`, and `more/_layout.tsx` (each a plain `Stack`) so nested screens push within their tab instead, and updated the parent `(tabs)/_layout.tsx`'s `Tabs.Screen` names from `"pois/index"` to `"pois"` etc. to point at the new nested navigators rather than a now-nonexistent leaf route.

**What "verified" means here — read this before trusting it blindly:**
Backend changes in this doc were verified by actually running the server and hitting real endpoints. **Mobile changes could not be runtime-verified the same way** — there's no Expo/Metro/simulator available in this environment. What *was* done:
1. A real `tsc --noEmit` type-check of `services/api.ts` and every file in `types/` against real `axios` and `@types/node` types (0 errors).
2. A syntax-parse (via the TypeScript compiler's parser) of all 65 mobile `.ts`/`.tsx` files — catches typos, mismatched braces, malformed JSX (0 errors).
3. Manual verification of every relative import path's `../` depth against actual file locations, and every component prop used against that component's real interface (e.g. `MetricCard`'s `color` prop, not a `positive` prop I almost used incorrectly).
4. A full `tsc` semantic check of the RN screen/component files was **not** run — the project's own `npm install` hits peer-dependency conflicts (`@shopify/react-native-skia` vs `victory-native`) unrelated to anything changed here, and resolving that was out of scope for this pass. That means **logic errors inside JSX expressions, incorrect hook usage, or React-specific mistakes are not ruled out** the way the backend's bugs were caught by actually running it.

**Practical implication:** before shipping, someone should run `npx expo start` and click through these screens once. That's a materially lower bar than what Phases 1–3 went through, and it's the honest state of things rather than a claim this was fully tested.

**Not yet done:** `BottomSheet`/`FilterSheet` (no filter UI on the POI/trade lists yet), `chart/[id].tsx` full-screen chart, jest test config (§6.4), and swapping the sparkline for real `victory-native` charts once the dependency conflict is resolved.

---

## 0-b. Update 2026-08-30 — Phase 3 complete

Backend response shapes now match what the mobile TypeScript types actually expect, field for field — verified both by a live `TestClient` run (including with real seeded trade data, not just empty tables) and a real `tsc --noEmit` type-check of every edited mobile file (`services/api.ts`, `types/risk.ts`) against the rest of `mobile/types/`.

**Fixed, matching §3 below one-for-one:**
- **§3a `/api` prefix** — `mobile/services/api.ts`'s `baseURL` was missing it entirely; every request would have 404'd. Fixed in both the main client and the token-refresh interceptor (which builds its own axios call and had the same bug independently).
- **§3a login format** — `authService.login` was POSTing OAuth2-style form-urlencoded `{username, password}`; the backend's `LoginRequest` schema is JSON `{email, password}`. These never matched. Fixed. Also fixed `/users/me` → `/auth/me`.
- **§3b list responses** — `POIListResponse`/`TradeListResponse` renamed `data` → `items`, added `page`/`pages`. POIs now genuinely paginate (`skip`/`limit` → `page`/`pages` computed from a real count query); trades report `page: 1, pages: 1` honestly, since `trade_repo` doesn't paginate yet — that's a known, separate gap, not silently faked.
- **§3c analytics metrics** — added `winning_trades`, `losing_trades`, `total_pl`, `total_net_pl` to match `AnalyticsMetrics`. Along the way, fixed `profit_factor()` returning `float('inf')` on an all-winning-trades account — `Infinity` isn't valid JSON and would have broken `JSON.parse` on the mobile client; capped at `999.99`.
- **§3d risk dashboard** — `RiskDashboardResponse` and `RiskLimits` fully reshaped to match `types/risk.ts` field-for-field (`open_risk_pct`, `daily_risk_pct`, `daily_pl`, `daily_drawdown_pct`, `max_drawdown_pct`, `total_exposure_pct`, `risk_per_trade_pct`, `warnings`, `limits.{daily_risk_limit_pct,max_drawdown_pct,risk_per_trade_pct}`), computed for real in `risk_service.py` rather than renamed. `daily_drawdown_pct` is a documented approximation (reuses the account's own EA-pushed `drawdown_pct` — there's no intraday equity snapshot table to compute a true one from). Added `CRITICAL` to `types/risk.ts`'s severity union, since `risk_service` emits it for drawdown breaches and the mobile type didn't have room for it.
- **§3e chart points** — `EquityPoint` → `{date, equity, balance}`, `DailyPLPoint`'s `cumulative_pl` → `cumulative`. `balance` mirrors `equity` at each historical point (documented in code): this curve only walks closed trades, so there's no floating P/L from still-open positions to distinguish the two at any past timestamp.
- **§3f POI metadata** — `POIResponse.metadata` added, aliased to the ORM's `metadata_data` column via `validation_alias` (verified this pydantic v2 pattern actually works before relying on it).
- **§3f `ea_registrations`** — added to `AccountResponse`. The ORM `relationship()` is still commented out (deferred — see below), so this is populated with an explicit query in `api/accounts.py` instead of lazy-loading.
- **Also fixed (not in §3, found while testing with real data):** `mobile/services/api.ts`'s `getEquityCurve` was typed to return `EquityPoint[]` directly; the backend returns `{equity_curve, daily_pl}` together. Fixed the mobile type. Also added `createAccount`, `journalService`, and `notificationsService` to `api.ts` — the backend routes existed after Phase 2 but nothing on the mobile client called them yet.
- **`account_id` made optional server-side** (was on the Phase 3 checklist, §8) — new `resolve_account_id()` helper in `core/dependencies.py` defaults to the user's first account when `account_id` isn't supplied, and still validates ownership when it is. Applied to `/pois`, `/trades`, `/analytics/metrics`, `/analytics/equity-curve`, `/risk/dashboard`.

**Found and fixed — a third round of bugs invisible until tested with real (non-empty) trade data:**
Every earlier test in this doc (Phase 1 and Phase 2) only ever exercised empty trade tables, because that's what a freshly-registered account starts with. The moment real closed trades were seeded in to verify the Phase 3 reshape, `/analytics/metrics`, `/analytics/equity-curve`, and `/risk/dashboard` all threw `TypeError`. Trade money/ratio columns (`net_profit`, `risk_amount`, `profit`, `r_multiple`, etc.) are SQLAlchemy `Numeric`, which return Python `Decimal` — and `Decimal` refuses to mix with plain `float` in arithmetic. `analytics/metrics.py`'s `expectancy()` (mixing `float` `win_rate` with `Decimal` `average_win`/`average_loss`), `analytics/equity.py`'s running balance, `api/analytics.py`'s starting-balance reconstruction, and `services/risk_service.py`'s risk/exposure percentages all had this bug independently. **This means `/analytics/metrics` and `/risk/dashboard` would have 500'd for literally any account with a single real closed trade, on the original code, before today.** Fixed with a `_f()` normalization helper in `metrics.py` (documented inline) and explicit `float()` casts everywhere else the same pattern appeared. Re-verified against seeded trade data with wins, an open position, and the `profit_factor` edge case — all pass now.

**Not yet touched:** the mobile screens (§4/§9's mobile section) are still shells — Phase 3 only touched the data layer (`services/`, `types/`), not any screen or component. Phase 4 is next.

---

## 0. Update 2026-08-29 (later same day) — Phase 2 complete

All four missing routers are built, wired in, and exercised end-to-end via `TestClient` (register → login → create account → hit every new route → assert on responses, including a negative-path 404 and an API-key-leak check). Full route list is now 27 endpoints (was 12 after Phase 1).

**Built:**
- `api/risk.py` — thin wrapper over the already-complete `RiskService`.
- `api/ea.py` — `GET /ea/monitor`, `POST /ea/register`, `DELETE /ea/{id}` (revoke). Added `account_id` to `EACreate` (the schema was missing it entirely — there was no way to say which account an EA belonged to). The raw API key is only ever returned once, on registration; `EAResponse.api_key` is explicitly nulled out everywhere else, because returning the ORM object directly would otherwise leak the *hashed* key through `from_attributes`.
- `api/journal.py` — CRUD keyed by `trade_id` (one journal entry per trade, matching the model's `unique=True` constraint), with ownership checks (trade → account → user) on every route. New `repositories/journal_repo.py`.
- `api/notifications.py` + `app/services/notification_service.py` — push-token register/unregister, notification history, and an Expo push sender (`httpx` POST to `exp.host`, logs every attempt to `NotificationLog` win or lose). New `repositories/notification_repo.py` and `schemas/notification.py` (didn't exist). **Wired into `ea_service`**: when an EA goes offline, the account owner now gets a push in addition to the WS event — otherwise this service would've been built-but-never-called, the same bug Phase 1 fixed for `ws_manager.startup()`.
- Missing detail routes: `GET /trades/{id}`, `GET /accounts/{id}`, `GET /analytics/equity-curve` (also wired the previously-unused `max_drawdown()` helper into `/analytics/metrics`, which was hardcoding `0.0`).
- `RiskLimits` now reads from `settings.DEFAULT_*` instead of hardcoded values (§3d/§6 gap) — field-name mapping is provisional pending the Phase 3 shape alignment, noted in-code.

**Found and fixed — two bugs serious enough that nobody could have logged in before this:**
- `core/security.py` referenced settings names that don't exist — `settings.ACCESS_TOKEN_EXPIRE_MINUTES`, `settings.REFRESH_TOKEN_EXPIRE_DAYS`, `settings.ALGORITHM`, `settings.SECRET_KEY` used for JWT signing. The real config fields are `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `JWT_REFRESH_TOKEN_EXPIRE_DAYS`, `JWT_ALGORITHM`, `JWT_SECRET_KEY`. Every call to `create_access_token()` — i.e. every login — raised `AttributeError`. **Login was completely broken.** This wasn't visible in Phase 1 because that only exercised `/health` and `/api/status`, neither of which touches auth.
- `requirements.txt` pins `passlib[bcrypt]==1.7.4` but doesn't pin `bcrypt` itself, so pip resolves `bcrypt` to a modern release (5.0.0) that removed the internals passlib 1.7.4 reads — breaking `hash_password()`/`verify_password()` outright (`ValueError` on every call). Pinned `bcrypt==4.0.1`, the last release compatible with passlib 1.7.4. **Registration was also completely broken**, independent of the JWT bug above.

Both are fixed and verified: full register → login → authenticated-request flow now works end-to-end.

**Not yet touched:** Phase 3's contract mismatches (§3), the mobile screens (§4/§9), and the infra/tooling gaps (§6) are all still open.

---

## 0a. Update 2026-08-29 — Phase 1 complete

The backend now **boots and serves requests**. Verified with a `TestClient` run through the full `lifespan`: `/health` → 200, `/api/status` → 200, and all 12 real API routes resolve (listed in §7).

**Fixed:**
- `api/router.py:13` — `from app.websocket.router import router as ws_router` imported a name (`router`) that doesn't exist in that module; the module defines `ws_router`. Changed to `from app.websocket.router import ws_router`.
- `api/router.py:27` — removed the duplicate `api_router.include_router(ws_router)`. `main.py` already mounts it directly at `/ws/{user_id}`, matching `mobile/.env`'s `EXPO_PUBLIC_WS_URL`; the old duplicate would have also served it at `/api/ws/{user_id}`.
- `app/services/ea_service.py` — **created**. `EAService` singleton with `run_offline_monitor()`: polls active `ONLINE` `EARegistration` rows every `EA_HEARTBEAT_TIMEOUT_SECONDS`, flips any past `EA_OFFLINE_ALERT_AFTER_SECONDS` to `OFFLINE`, and publishes an `EA_OFFLINE` WS event via the existing `publish_ea_event()` helper.
- `main.py` `lifespan` — now calls `register_handlers()` and `event_bus.start()`/`stop()`, so `POI_CREATED` / `POSITION_OPENED` events published to the bus actually reach subscribers (this was written but never wired up before).

**Found and fixed — not in the original write-up:**
- `websocket/manager.py`'s `ConnectionManager.startup()` / `.shutdown()` (the Redis pub/sub listener) were **never called anywhere in the codebase** — not in `main.py`, not in the router. Even with `register_handlers()` wired up, `publish_to_account()` would silently no-op (`if not self._redis: return`) because `self._redis` was never initialized. Added `await ws_manager.startup()` / `.shutdown()` to `main.py`'s `lifespan`. This was arguably the bigger real-time bug — worth knowing about if real-time updates still look dead after Phase 3.

**Not yet touched:** Phase 2's four routers are now done (§0 above). Everything in §3–§6 and §9's mobile section is unchanged from the original analysis — the backend↔mobile contract mismatches, the mobile shell screens, and the infra/tooling gaps are all still open. Sections below are kept as originally written (with strikethrough-equivalent notes where Phase 1/2 already closed something).

---

## TL;DR

The **foundation is broadly built** — 7 backend model files, 4 repositories, 5 services, 6 API routers, a full WebSocket manager, an event bus, a 12KB demo seeder, a 20KB MT5 simulator, a 14KB MQL5 adapter, and the mobile app's entire type/hook/component/store layer all exist and look coherent.

Two things were unfinished when this doc was first generated, and they were both mid-sentence:

1. ~~**The backend cannot start.**~~ **Fixed 2026-08-29 (§0a).** Two hard `ImportError`s on module load / first request, plus a missing `ea_service` module and dead real-time wiring.
2. ~~**The mobile app is a shell.**~~ **Largely fixed 2026-08-30 (§0-c, Phase 4 first pass).** 3 of the 4 shell tab screens (POIs, Trades, Analytics) are now built against real data, plus registration and all 7 "More" tab screens that didn't exist at all. Not fully done — see §0-c for what's left and, importantly, what could and couldn't be verified without a running Expo instance.

The backend's four missing routers are also now built (§0, Phase 2) — along with two previously-undocumented bugs that meant **nobody could actually log in or register** until today. The backend now has 29 working routes.

There was also a **third, quieter problem**: even after the backend booted, the mobile app wouldn't talk to it correctly — every endpoint path was wrong (missing `/api` prefix) and several response shapes didn't match the TypeScript types. ~~Details in §3.~~ **Fixed 2026-08-30 (§0-b, Phase 3)** — along with a third round of bugs, invisible until tested with real (non-empty) trade data, that would have 500'd the analytics and risk endpoints for any account with a single real closed trade.

---

## 1. Hard blockers — backend will not boot ✅ resolved 2026-08-29 (§0)

| # | Problem | Location | Detail |
|---|---|---|---|
| 1 | `ImportError` on app import | `backend/app/api/router.py:13` | `from app.websocket.router import router as ws_router` — but `websocket/router.py:16` only defines **`ws_router`**. There is no name `router` in that module. Raised at `create_app()` → i.e. at `import app.main`, so **uvicorn dies immediately**. |
| 2 | `ImportError` on startup | `backend/app/main.py:49` | `from app.services.ea_service import ea_service` — **`app/services/ea_service.py` does not exist.** Raised inside `lifespan`, so the process starts then dies during boot. |

**#1 is the very first thing to fix** — nothing else is reachable until it is. Fix is one word (`ws_router`), or add an alias in `websocket/router.py`.

**#2 needs a real module.** `ea_service` must expose at minimum an `ea_service` singleton with an awaitable `run_offline_monitor()`. The supporting pieces already exist to build it: `EARegistration` model (`models/account.py:33`), `EARegistrationStatus`, and the config knobs `EA_HEARTBEAT_TIMEOUT_SECONDS` / `EA_OFFLINE_ALERT_AFTER_SECONDS` (`core/config.py`).

---

## 2. Missing backend modules ✅ resolved 2026-08-29 (§0, Phase 2)

All four are already imported-and-commented in `api/router.py:9-12` and `:23-26` — uncommenting them is the last step, not the first.

| Module | Status | What it needs | Groundwork that already exists |
|---|---|---|---|
| `app/services/ea_service.py` | ✅ built 2026-08-29 | `ea_service` singleton + `run_offline_monitor()` background loop; heartbeat → ONLINE/OFFLINE transitions | `EARegistration` model, `publish_ea_event()` in `websocket/events.py`, `/mt5/heartbeat` route in `api/mt5.py:16` |
| `app/api/ea.py` | ✅ built 2026-08-29 | `GET /ea/monitor` (mobile calls it), EA register/list/revoke | `EAResponse` + `EACreate` schemas already written in `schemas/account.py:17-31` (had to add `account_id` to `EACreate` — it was missing) |
| `app/api/risk.py` | ✅ built 2026-08-29 | `GET /risk/dashboard` (mobile calls it) | **`services/risk_service.py` is fully implemented** — this router is a thin wrapper over `RiskService.get_risk_dashboard()` |
| `app/api/journal.py` | ✅ built 2026-08-29 | CRUD for trade journal entries | `TradeJournal` model + `schemas/journal.py` both exist |
| `app/api/notifications.py` | ✅ built 2026-08-29 | push-token register/unregister, notification history | `PushToken` + `NotificationLog` models exist in `models/notification.py` |
| `app/services/notification_service.py` | ✅ built 2026-08-29 | Expo push sender using `EXPO_ACCESS_TOKEN` | Config key exists; README §Key Features advertises this. Wired into `ea_service`'s offline check so it isn't dead code. |

### Missing endpoints the mobile app already calls — all now built (§0, Phase 2)

`mobile/services/api.ts` calls 8 endpoints. As of the original analysis, 3 had no backend route at all — all three now exist, plus the two detail routes below:

| Mobile call | Backend route | Status |
|---|---|---|
| `/auth/login` | `api/auth.py:16` | exists |
| `/auth/register` | `api/auth.py:11` | exists |
| `/accounts` | `api/accounts.py:13` | exists |
| `/analytics/metrics` | `api/analytics.py:14` | exists |
| `/users/me` | — | **wrong path**, still open (Phase 3) — backend has `/auth/me` (`api/auth.py:40`) |
| `/analytics/equity-curve` | `api/analytics.py` | ✅ built 2026-08-29 |
| `/risk/dashboard` | `api/risk.py` | ✅ built 2026-08-29 |
| `/ea/monitor` | `api/ea.py` | ✅ built 2026-08-29 |

`getTrade(id)` → `GET /trades/{id}` ✅ built. `getAccount(id)` → `GET /accounts/{id}` ✅ built. The `/api` prefix mismatch (§3a) still applies to all of these — the routes exist now, but the mobile client is still calling the wrong base path until Phase 3.

---

## 3. Backend ↔ mobile contract mismatches ✅ resolved 2026-08-30 (§0-b, Phase 3)

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
| **Event-bus handlers** | `events/handlers.py:18` | ✅ resolved 2026-08-29 (§0a) — `register_handlers()` is now called in `main.py`'s `lifespan`. |
| **WebSocket router double-mount** | `main.py:101` + `api/router.py:27` | ✅ resolved 2026-08-29 (§0a) — duplicate `include_router(ws_router)` removed. |
| **`ws_manager.startup()`/`.shutdown()`** | `websocket/manager.py` | ✅ resolved 2026-08-29 (§0a) — found during Phase 1, not in the original write-up. Never called anywhere, so `publish_to_account()` was silently no-op'ing even after the event-bus fix above. Now called in `lifespan`. |
| **Analytics `max_drawdown`** | `api/analytics.py:31` | ✅ resolved 2026-08-29 (§0, Phase 2) — now wired to the `analytics/equity.py`-backed helper instead of hardcoded `0.0`. |
| **`notification_service.py`** | `services/notification_service.py` | Built 2026-08-29 (§0, Phase 2) alongside `api/notifications.py`, and deliberately wired into `ea_service`'s offline check so it wouldn't join this list — a push now fires when an EA goes offline. Nothing else calls it yet (no push on `POI_CREATED`/`POSITION_OPENED`/trade closed) — worth deciding in Phase 3/4 which of those should also notify. |
| **ORM relationships** | `models/account.py:31`, `models/journal.py:16` | both `relationship()` calls commented out — blocks nested responses (§3f). Still open. |

---

## 6. Infrastructure & tooling gaps

| # | Problem | Impact |
|---|---|---|
| 1 | **`backend/app/db/migrations/` is completely empty** — no `env.py`, no `script.py.mako`, no `versions/` | `alembic.ini` points at it and `docker-compose.yml` runs `alembic upgrade head` as the **first command** of the backend container → **container fails to start**. Currently masked only because `main.py:38` does `Base.metadata.create_all` instead. Still open — tracked for Phase 5. |
| 2 | **`scripts/` directory is empty** | `docker-compose.yml:16` mounts `./scripts/init_db.sql` into the Postgres init hook. Docker will create a **directory** at that path instead of a file — Postgres init silently does nothing. README also promises "setup and utility scripts". Still open — Phase 5. |
| 3 | **`backend/tests/` has only `conftest.py`** | README §Running tests advertises `pytest tests/test_auth.py` and `pytest tests/ -k "idempotency"`. **Zero test files exist.** Also `conftest.py:22` uses the deprecated `AsyncClient(app=app)` form, which fails on httpx ≥ 0.28 (pinned at 0.27.2, so OK for now). Still open — Phase 5. |
| 4 | **No jest config in mobile** | `package.json` has `jest` + `jest-expo` deps and a `test` script, but **no `jest` key and no `jest.config.js`**, and no test files. README's `npx jest` will not run. `jest-expo` preset is never referenced. Still open. |
| 5 | **`alembic.ini:6` hardcodes SQLite** | `sqlalchemy.url = sqlite+aiosqlite:///./mt5_monitor.db` — contradicts the Postgres `DATABASE_URL`. Should read from env/settings. Still open. |
| 6 | **`ALLOWED_ORIGINS` parsing** **[likely]** | `.env.example:12` is comma-separated; `config.py:12` types it as `List[str]`. pydantic-settings v2 JSON-parses complex types → a comma string raises **`ValidationError` on settings load** once you `cp .env.example .env`. Needs a JSON array in `.env` or a custom validator. Still open. |
| 7 | `CORS_ALLOW_ALL` default disagrees with `.env.example` | `config.py:13` defaults `True`; `.env.example:54` says `false`. Insecure-by-default if `.env` is absent. Still open. |
| 8 | `LOG_FORMAT` in `.env.example:51` has no `Settings` field | Harmless (`extra="ignore"`), but it's silently dropped. Still open, low priority. |
| 9 | `backend/generate_backend.py` (5KB) is a one-shot scaffolding script, still in the tree | It **overwrites** files under `backend/` from an embedded dict. Re-running it now would clobber hand-edited work — worth deleting or moving out. Still open. |
| 10 | ~~Not a git repository~~ | ✅ resolved — repo now has commit history (4 commits as of 2026-08-29: Phase 1 fixes, `.gitignore` cleanup, plan-conformance audit, Phase 2 fixes). |
| 11 | **`passlib`/`bcrypt` version mismatch** | ✅ resolved 2026-08-29 (§0, Phase 2) — `requirements.txt` pinned `bcrypt==4.0.1`. Found while testing Phase 2 routers; broke every password hash/verify call. |

---

## 7. What's actually done — don't rebuild these

So the next session doesn't redo finished work:

**Backend (solid):**
- All 7 model files — `user`, `account` (+`EARegistration`), `poi`, `trade`, `journal`, `notification`, `event`
- All 6 repositories (`account`, `poi`, `trade`, `user`, + new `journal`, `notification`); `db/base.py` mixins; `db/session.py`
- `services/`: `auth`, `poi`, `trade`, `risk`, `analytics`, `ea_service`, `notification_service` — all implemented
- `api/`: `auth` (register/login/refresh/logout/me), `mt5` (heartbeat, poi, position open/update/close, config), `pois` (list/get/patch), `trades` (list/get), `accounts` (list/create/get), `analytics` (metrics/equity-curve), `risk` (dashboard), `ea` (monitor/register/revoke), `journal` (CRUD), `notifications` (token register/unregister, history) — **all 10 routers built and wired**
- `websocket/manager.py` (9KB — connection registry + Redis pub/sub, now actually started/stopped), `websocket/events.py`, `websocket/router.py` (JWT-authenticated, account-scoped)
- `events/bus.py` (now started/stopped and subscribed); `analytics/metrics.py` (now fully wired, including `max_drawdown`) + `analytics/equity.py`
- `core/`: `config`, `security` (JWT bug fixed), `dependencies`, `exceptions`, `logging`
- `db/seed.py` (12KB demo seeder)
- Working, verified auth: register → login → authenticated requests (was broken until 2026-08-29, see §0)

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

### Phase 1 — make it boot (small, unblocks everything) ✅ done 2026-08-29
- [x] Fix `api/router.py:13` → import `ws_router`, not `router`
- [x] Remove the duplicate `api_router.include_router(ws_router)` at `api/router.py:27`
- [x] Write `app/services/ea_service.py` (singleton + `run_offline_monitor()`)
- [x] Call `register_handlers()` in `main.py`'s `lifespan` — turns real-time on
- [x] Bonus fix: `ws_manager.startup()`/`.shutdown()` were never called anywhere — added to `lifespan` too, or `publish_to_account()` would keep silently no-op'ing even with handlers registered
- [x] Verify: `python -c "import app.main"` then full lifespan boot via `TestClient` — `/health` and `/api/status` both 200, all 12 routes resolve

### Phase 2 — the four missing routers ✅ done 2026-08-29
- [x] `api/risk.py` (thin — service is done)
- [x] `api/ea.py` — `GET /ea/monitor` + register/revoke
- [x] `api/journal.py` — CRUD
- [x] `api/notifications.py` + `app/services/notification_service.py`
- [x] Add the missing detail routes: `GET /trades/{id}`, `GET /accounts/{id}`, `GET /analytics/equity-curve`
- [x] Verify: every path in `mobile/services/api.ts` now has a matching backend route — confirmed via `TestClient` register→login→CRUD run against all new routes, including 404 and API-key-leak checks
- [x] Bonus fixes found while testing: JWT settings mismatch (login was broken) and passlib/bcrypt incompatibility (registration was broken) — see §0

### Phase 3 — fix the contract (do this *before* building screens) ✅ done 2026-08-30
- [x] Decide the `/api` prefix question (§3a) and fix both `baseURL` **and** the refresh interceptor
- [x] Align list responses: `data` → `items`, add `page`/`pages` (§3b)
- [x] Align `MetricsResponse`, `RiskDashboardResponse`, `EquityPoint`, `DailyPLPoint` (§3c–3e)
- [x] Rename `/users/me` → `/auth/me` on the client
- [x] Make `account_id` optional server-side (default to the user's active account) — kills the silent 422s
- [x] Add `CRITICAL` to the mobile severity union
- [x] Point `RiskLimits` at `settings.DEFAULT_*` instead of hardcoded values — done 2026-08-29 (§0, Phase 2), field-name mapping finalized in Phase 3's reshape (§0-b)
- [x] Bonus fixes found while testing with real trade data: Decimal/float `TypeError`s across `analytics/metrics.py`, `analytics/equity.py`, `api/analytics.py`, `services/risk_service.py` — see §0-b

### Phase 4 — build the screens (first pass done 2026-08-30, §0-c)
- [ ] Finish Dashboard — import the already-written `AccountSummary` + `POISummary` (dashboard was already partially built pre-Phase-4; this specific polish item is still open)
- [x] POIs list (status filters not yet added — see below) + `pois/[id]`
- [x] Trades list (open/closed) + `trades/[id]` with journal editor
- [x] Analytics (metrics grid + equity curve) — used a lightweight `View`-based sparkline instead of `victory-native`; see §0-c for why
- [x] More → risk dashboard, EA monitor, settings, account switcher — plus journal, notifications, and profile, which weren't explicitly itemized here but were also missing
- [x] Nested `[id]`/sub-screen routes don't pollute the tab bar — done via `_layout.tsx` Stack navigators per tab folder (`pois/_layout.tsx`, `trades/_layout.tsx`, `more/_layout.tsx`) rather than `href: null` entries; functionally equivalent, arguably cleaner
- [ ] Status filters / `FilterSheet` on the POI and trade lists — lists work but show everything, no filter UI yet
- [ ] `chart/[id].tsx` full-screen chart — still missing
- [ ] Swap the sparkline for real `victory-native` charts once someone can verify it against a running Metro bundle
- [ ] **Run it** — none of the above has been exercised in an actual Expo/Metro instance; see §0-c's verification caveat before treating this as done-done

### Phase 5 — infra & tests
- [ ] `alembic init` into `app/db/migrations/`, make `alembic.ini` read `DATABASE_URL`, generate `0001_initial`
- [ ] Write `scripts/init_db.sql` (or drop the compose mount)
- [ ] Backend tests: auth, MT5 idempotency, risk, EA heartbeat (the ones the README claims)
- [ ] Mobile: add the `jest-expo` preset config + first component tests
- [ ] Fix `ALLOWED_ORIGINS` parsing; flip `CORS_ALLOW_ALL` default to `False`
- [ ] Delete or relocate `backend/generate_backend.py` before it clobbers something
- [ ] `git init` + first commit

---

## 9. Conformance against the original implementation plan

Cross-checked every file/folder named in the original approved implementation plan against what actually exists in the repo. This is a different lens from §1–§8 above — those ask "does it work," this asks "does it match what was scoped and approved." Only **deviations** are listed; everything not mentioned here was built as planned.

### Backend — mostly on-plan, with real gaps

| Planned | Status |
|---|---|
| `app/db/migrations/` (Alembic) | **Missing** — empty dir, already flagged in §6.1. Still open. |
| `app/api/journal.py`, `risk.py`, `ea.py`, `notifications.py` | ✅ Built 2026-08-29 (§0, Phase 2) |
| `app/services/notification_service.py` | ✅ Built 2026-08-29 (§0, Phase 2), and wired into `ea_service`'s offline check rather than left dead |
| `app/analytics/risk.py` | **Missing** as its own module — drawdown/exposure calculations instead live inside `services/risk_service.py`. Functionally may cover the same ground; worth confirming nothing planned there (e.g. exposure-by-symbol) got dropped |
| `app/services/ea_service.py` | Built 2026-08-29 (§0a), but only covers the offline-monitor half of what the plan called "Heartbeat, EA health tracking" — heartbeat *receipt* is handled separately in `api/mt5.py`. No gap in practice, just split across two files |
| `backend/tests/` (6 test files planned: auth, poi, trades, analytics, websocket, idempotency) | **All six missing** — only `conftest.py` exists. Already flagged in §6.3, but worth restating: this means **zero automated coverage** of anything built so far, including today's Phase 2 work (it was verified manually via `TestClient`, not via a committed test suite) |
| `/mt5/simulator/scenarios.py` | Planned as a separate file of pre-built trade scenarios; actual repo folds everything into a single 490-line `main.py`. Not a functional gap, just a structural one |

### Mobile — the biggest gap between plan and reality, now substantially narrowed (§0-c, Phase 4 first pass)

The plan specified a `/mobile/features/` layer (dashboard/, pois/, trades/, analytics/, journal/, risk/, accounts/, auth/ — one module per domain) sitting between screens and hooks/store. **That entire layer still doesn't exist**, and Phase 4's first pass didn't add it — screens call hooks and stores directly, same as before. Not necessarily wrong, but still the one deliberate-looking architectural deviation from the approved plan that hasn't been consciously revisited.

Screens and routes planned but not present:
| Planned route | Status |
|---|---|
| `(auth)/register.tsx` | ✅ built 2026-08-30 |
| `pois/[id].tsx`, `trades/[id].tsx` | ✅ built 2026-08-30 |
| `more/journal/`, `more/risk/`, `more/accounts/`, `more/ea-monitor/`, `more/notifications/`, `more/settings/`, `more/profile/` | ✅ all seven built 2026-08-30 |
| `chart/[id].tsx` (full-screen chart) | **Still missing** |

Components planned but not present:
| Planned | Status |
|---|---|
| `BottomSheet.tsx`, `FilterSheet.tsx` | **Still missing** — no filter UI exists yet for the now-built POI/trade lists |
| `NotificationCard.tsx`, `AccountCard.tsx`, `EAStatusCard.tsx` | ✅ all three built 2026-08-30, used by their respective `more/` screens |
| `Header.tsx`, `SectionHeader.tsx` | ✅ both built 2026-08-30 |

`useRisk.ts` — ✅ built 2026-08-30, wired to the real `/risk/dashboard` route. A duplicate `useRiskDashboard()` that had been pasted into `useAnalytics.ts` was found and removed in the process.

**Important caveat carried over from §0-c:** everything marked ✅ above was verified by type-checking and manual review, not by running Expo. See §0-c for exactly what that does and doesn't rule out.

Two small additions beyond the plan that are worth keeping: `components/dashboard/AccountSummary.tsx` + `POISummary.tsx`, and `services/mockData.ts` (used as the offline/dev fallback the hooks already read from).

### Infra & docs — the "polish" items were skipped

| Planned | Status |
|---|---|
| `/docs/API.md`, `WEBSOCKET.md`, `DEVELOPMENT.md` | **Missing** — only `MT5_INTEGRATION.md` exists |
| `/scripts/setup.sh`, `seed_demo.py`, `run_simulator.py` | **All missing** — `/scripts/` is empty, already flagged in §6.2 |
| `docker/nginx.conf` | **Missing** — production-only, low priority pre-launch |

### Net read

Backend is now essentially on-plan — every router and service the plan named exists and is verified working (§0). The remaining backend gaps are infra/tooling (migrations, tests) rather than missing functionality. Mobile is still where plan and reality diverge most: the dashboard/POI-list/trade-list/analytics tab shells exist, but essentially everything reachable from the "More" tab — journal, risk, accounts, EA monitor, notifications, settings, profile — was scoped and approved but never started, and registration is missing entirely so new users can't sign up. That's Phase 4's real scope, larger than the original write-up implied. Phase 3 (contract alignment) is the more urgent next step now that the backend routes it needs to align against actually exist.

---

| Area | Files to create | Files to edit | Status |
|---|---|---|---|
| Phase 1 | 1 | 2 | ✅ done |
| Phase 2 | 6 | 4 | ✅ done |
| Phase 3 | 0 | ~8 | ✅ done |
| Phase 4 | 6–8 | 2 | 🟡 first pass done, unverified in Expo |
| Phase 5 | ~10 | 4 | open |

Phases 1–3 are done — the backend boots, every planned route responds, and the mobile data layer (`services/`, `types/`) speaks the same shape the backend actually returns, verified with real trade data and a real `tsc` check. Phase 4's first pass is also done — registration, all 7 "More" screens, and the 3 remaining shell tabs are built — but unlike everything before it, **this hasn't been run in an actual Expo instance**, only type-checked and manually reviewed. That's the next real milestone: `npx expo start` and see what breaks.
