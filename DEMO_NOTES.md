# Demo Notes — Onboarding Diary

A practical guide for demoing the application: how to start it, which accounts to
use, the key screens and APIs, and a suggested 10-minute flow.

---

## 1. Test Accounts

The backend seeds a **single admin** on startup when `SEED_ENABLED=true`
(configurable via env vars). Manager and recruit accounts are then created by the
admin through the UI/API — this mirrors the MVP "admin-managed users" decision.

| Role | Email | Password | How it exists |
|---|---|---|---|
| **Admin** | `admin@onboardingdiary.local` | `ChangeMe!2026` | Auto-seeded (`SEED_*` env vars) |
| **Manager** | e.g. `manager@onboardingdiary.local` | set on creation | Created by admin (assign recruits via `manager_id`) |
| **Recruit** | e.g. `recruit@onboardingdiary.local` | set on creation | Created by admin |

> Override the seed admin with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` /
> `SEED_ADMIN_NAME`. Never use the default password outside local/demo.

### Running locally
```bash
# Postgres (docker-compose provides one)
docker compose up -d db

# Backend (port 8080)
cd backend
DB_URL=jdbc:postgresql://localhost:5432/onboarding_diary \
DB_USERNAME=onboarding DB_PASSWORD=onboarding \
JWT_SECRET='dev-only-secret-change-me-please-32bytes-minimum!!' \
CORS_ALLOWED_ORIGINS=http://localhost:5173 \
SEED_ENABLED=true \
mvn spring-boot:run

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```
Open http://localhost:5173 · Swagger at http://localhost:8080/swagger-ui.html

---

## 2. Demo Walkthrough

1. **Login** as admin → lands on the **Dashboard**.
2. **Create users** (admin): a manager and one or two recruits; assign recruits to the manager.
3. **As a recruit**: create a few Tasks, an Issue, a Feedback note, and an Additional Note.
4. **Dashboard**: show summary cards, completion %, open-issue breakdown, recent activity (rows deep-link to detail).
5. **Search**: query a keyword, filter by entity type, switch relevance/date sort, click a result → detail page.
6. **Analytics**: show the five charts; apply a date range to watch them update.
7. **Reports**: pick Combined, set a date range, download CSV and PDF.
8. **RBAC**: log in as the manager → see only assigned recruits' data; as the recruit → only own data.

---

## 3. Key Screens

| Screen | Route | What to highlight |
|---|---|---|
| Login | `/login` | Generic error on bad creds (no user enumeration) |
| Dashboard | `/dashboard` | Summary cards, completion/open-issue metrics, recent-activity deep links |
| Analytics | `/analytics` | 5 charts; date-range filter re-queries; hover tooltips; per-card empty state |
| Tasks / Issues / Feedback / Notes | `/tasks` … | List + filters, detail, create/edit; owner-only edit/delete |
| Search | `/search` | Search box, entity-type checkboxes, sort, snippet + badge + deep link |
| Reports | `/reports` | Type + date selectors, CSV/PDF downloads |
| Profile | `/profile` | Self-service edit (name, department) |

---

## 4. Key APIs

All under `/api/v1`, JWT in `Authorization: Bearer <token>` (except login).

```bash
# 1. Login → token
curl -s localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@onboardingdiary.local","password":"ChangeMe!2026"}'

# 2. Dashboard aggregation
curl -s localhost:8080/api/v1/dashboard -H "Authorization: Bearer $T"

# 3. Cross-entity search (keyword + type filter + sort)
curl -s "localhost:8080/api/v1/search?q=onboarding&types=TASK,NOTE&sort=RELEVANCE" \
  -H "Authorization: Bearer $T"

# 4. Analytics (date-range filtered)
curl -s "localhost:8080/api/v1/analytics?dateFrom=2026-02-01&dateTo=2026-02-28" \
  -H "Authorization: Bearer $T"

# 5. Combined report as PDF (file download)
curl -s "localhost:8080/api/v1/reports?type=COMBINED&format=PDF" \
  -H "Authorization: Bearer $T" -o combined-report.pdf
```

**Notable status codes to demo:** `401` (no token), `400` (blank search `q` /
inverted date range), `403` (filtering an `ownerId` outside your scope),
`404` (reading another user's record).

---

## 5. Suggested 10-Minute Demo Flow

| Time | Action | Talking point |
|---|---|---|
| 0:00–1:00 | Login as admin; tour Dashboard | One RBAC primitive scopes every screen |
| 1:00–2:30 | Create a manager + 2 recruits; assign recruits | Admin-managed users (MVP simplification) |
| 2:30–4:00 | As a recruit, create Tasks/Issue/Feedback/Note | Four record types, consistent CRUD + validation |
| 4:00–5:30 | Back to Dashboard; click recent-activity rows | Aggregation + deep linking |
| 5:30–7:00 | Search a keyword; filter type; toggle sort; open a result | Cross-entity search, relevance scoring, snippets |
| 7:00–8:30 | Analytics; apply a date range | 5 chart series, dependency-free SVG, live filtering |
| 8:30–9:30 | Reports → Combined → download CSV + PDF | Format-agnostic rendering, RBAC-scoped exports |
| 9:30–10:00 | Switch to manager / recruit login | RBAC: manager sees assigned only; recruit sees own |

**Backup talking points if time allows:** Testcontainers-backed integration tests
against real Postgres, the `GlobalExceptionHandler` error envelope, and the
deliberate deferral of refresh tokens / SSO / per-field encryption per the design review.
