# Vehicle Service Management System (VSMS)

A full-stack workshop management application for vehicle service orders, parts inventory, and revenue analytics. Built for a 24-hour assessment.

## Live demo

- **Frontend:** https://vehicle-management-system-gamma.vercel.app
- **Backend / API:** https://vehicle-management-system-production-e126.up.railway.app
- **API docs (Swagger UI):** https://vehicle-management-system-production-e126.up.railway.app/api/schema/swagger-ui/
- **Demo credentials:** `ritam` / `ritam#1234`

## Features

- ✅ JWT authentication (access + refresh) via `djangorestframework-simplejwt`
- ✅ Components inventory — CRUD, soft-delete, type filtering (New Part / Repair Service), stock tracking
- ✅ Vehicles registry — CRUD with search by registration or owner
- ✅ Service orders with a 6-state machine: `DRAFT → QUOTED → IN_PROGRESS → COMPLETED → PAID` (plus `CANCELLED`)
- ✅ **New-vs-Repair comparison** — every new part can link to a repair alternative; the "Add Item" dialog shows both side-by-side with computed savings (₹ and %)
- ✅ Out-of-stock awareness — when a new part has zero stock, the repair alternative is auto-highlighted
- ✅ Price snapshots on every line item — historical invoices don't mutate when a component's price changes later
- ✅ A4 PDF invoices via WeasyPrint, gated to `COMPLETED` or `PAID` orders
- ✅ Revenue dashboard — KPI cards, bar chart (daily / monthly / yearly), secondary order-count line chart, click-to-drill-down sheet, top-components leaderboard
- ✅ Cmd+K command palette — navigation, create shortcuts, and live search across components + vehicles
- ✅ Fully responsive — mobile, tablet, desktop
- ✅ **47 automated tests** — 32 backend (pytest) + 15 frontend (vitest)

## Tech stack

| Layer | Choice |
|---|---|
| Backend framework | Django 5 + Django REST Framework |
| Auth | SimpleJWT (token + refresh) |
| Database | PostgreSQL (Neon in prod, Docker locally) |
| API docs | drf-spectacular (OpenAPI + Swagger UI) |
| PDF generation | WeasyPrint |
| Frontend build | Vite + React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v3 + shadcn/ui (industrial skeuomorphic theme) |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Command palette | cmdk |
| Tests | pytest + pytest-django, Vitest + Testing Library |
| Hosting | Railway (backend in Docker), Vercel (frontend), Neon (Postgres) |

## Architecture

```
┌──────────────┐      HTTPS       ┌──────────────┐      Postgres over TLS      ┌─────────┐
│  Vercel      │ ───────────────→ │  Railway     │ ─────────────────────────→  │  Neon   │
│  React SPA   │ ← JSON + PDF ─── │  Django+Gunic│                             │  Pg 17  │
└──────────────┘                  └──────────────┘                             └─────────┘
     ▲                                  ▲
     │  VITE_API_URL                    │  DATABASE_URL (from Neon)
     └──────────────────────────────────┘
```

- Frontend calls `/api/*` which hits the Railway backend through `VITE_API_URL`.
- Railway builds from a `Dockerfile` that installs WeasyPrint's C dependencies (pango/cairo/harfbuzz).
- Neon provides the production database; local development uses a docker-compose Postgres.

## Local setup

### Prerequisites

- Python 3.11+, Node 20+, Docker (for local Postgres)

### 1. Start Postgres

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed               # 20 components, 15 vehicles, 30 orders, ~13 payments
python manage.py createsuperuser    # follow prompts
python manage.py runserver 8000
```

Backend available at `http://localhost:8000/`. API docs at `http://localhost:8000/api/schema/swagger-ui/`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend at `http://localhost:5173/`. Sign in with the superuser you just created.

## Environment variables

### Backend (`backend/`)

| Variable | Required in prod | Default / example |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | ✅ | `backend.settings.prod` |
| `SECRET_KEY` | ✅ | *(generate with `openssl rand -hex 32`)* |
| `DEBUG` | — | `False` in prod |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host/db?sslmode=require` |
| `ALLOWED_HOSTS` | ✅ | `your-railway-subdomain.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | ✅ | `https://your-app.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | ✅ | `https://your-app.vercel.app` |
| `COMPANY_NAME` | — | `AutoCare Service Center` |
| `COMPANY_ADDRESS` | — | `123 MG Road, Bengaluru, ...` |
| `COMPANY_GSTIN` | — | `29AABCU9603R1ZM` |

For local dev, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` are used when `DATABASE_URL` is unset.

### Frontend (`frontend/`)

| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | In prod | `https://your-backend.up.railway.app/api` |

Unset in dev: requests go to `/api` and Vite proxies them to `http://localhost:8000`.

## Running tests

### Backend

```bash
cd backend
pytest
```

Currently **32 tests** passing across models, API flows, and revenue aggregation. Factories built with factory-boy.

### Frontend

```bash
cd frontend
npm test
```

Currently **15 tests** passing — formatters, auth hook, form validation.

## Design decisions

- **`DecimalField` everywhere for money.** Never float. Every price, total, and payment amount is a `Decimal` with explicit `quantize()` where rounding matters.
- **Price snapshots on line items.** `ServiceItem.unit_price_snapshot` is captured from `Component.unit_price` on first save and frozen. Historical orders stay correct even after a component's price changes.
- **Server-side state machine enforcement.** The `transition` endpoint validates legal state changes against a whitelist — you can't mark a DRAFT order as PAID by sending a forged PATCH.
- **Composable revenue aggregation.** The `/api/revenue/timeseries/` endpoint accepts a `granularity` parameter (`day` / `month` / `year`) and delegates to Django's `TruncDay` / `TruncMonth` / `TruncYear` — one ORM expression, three resolutions.
- **PDF rendering in-process via WeasyPrint.** No external service, no queue. Invoice generation is bounded (< 100 KB output per order) so a synchronous request is the right call over-engineering-wise.
- **JWT refresh interceptor.** A single axios instance handles 401 → refresh → retry, transparent to components.
- **Industrial skeuomorphic design.** Custom neumorphic shadow system + safety-orange accent + monospace labels, all wired through CSS variables so the Tailwind layer stays thin.

## Trade-offs and what I'd do next

- **No Celery / background jobs.** PDF generation runs inline. If invoices grew large or bulk-export became a feature, I'd move them to a Celery task backed by Redis.
- **No Sentry / error reporting.** Frontend errors surface as Sonner toasts; backend errors land in Railway logs. For a real workshop I'd wire Sentry into both sides.
- **No multi-tenancy.** One shop, one database. Extending to multiple shops would start with a `Workshop` FK on every model and row-level permissions.
- **Single role.** Every authenticated user has full access. Role-based permissions (Manager / Mechanic / Front Desk) would live on `User.groups` with DRF permission classes.
- **No audit log.** `ServiceOrder` transitions aren't journaled. Adding an immutable `OrderEvent` table would be a ~1h task if the assessment asked for compliance later.
- **Cold-start on Railway free tier.** The demo may take a few seconds to wake up on first request.

## Project structure

```
.
├── backend/                      Django project
│   ├── Dockerfile               Railway build (WeasyPrint deps + gunicorn)
│   ├── backend/
│   │   └── settings/            base.py / dev.py / prod.py split
│   ├── services/                Main app
│   │   ├── models.py            Component, Vehicle, ServiceOrder, ServiceItem, Payment
│   │   ├── serializers.py
│   │   ├── views.py             ViewSets + custom actions (add-item, transition, pay, compare, invoice)
│   │   ├── templates/
│   │   │   └── invoice.html     WeasyPrint HTML → PDF
│   │   ├── management/commands/
│   │   │   └── seed.py          Demo data seeder
│   │   └── tests/               32 pytest tests + factories
│   └── requirements.txt
├── frontend/                     Vite + React
│   ├── vercel.json              SPA rewrites
│   └── src/
│       ├── pages/               LandingPage, LoginPage, DashboardPage, ...
│       ├── features/            Feature-scoped (components, vehicles, orders, dashboard)
│       ├── components/          Layout, CommandPalette, industrial/, ui/ (shadcn)
│       ├── hooks/               useAuth, useDebounce
│       └── lib/                 api.ts, format.ts, types.ts, utils.ts
├── docker-compose.yml            Local Postgres
├── CLAUDE.md                    Build conventions + hard rules
└── PLAN.md                      Phased execution plan
```

## License

Built as a job assessment submission. Not for production use without review.
