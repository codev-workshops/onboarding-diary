# onboarding-diary

Onboarding Diary Application — a web app for new recruits to document their onboarding journey.
Recruits log daily tasks, issues, feedback and notes; managers review entries and download
reports; admins see everything.

The UI is built strictly against the repository design system in
[`devin_context/design-system`](./devin_context/README.md) — see
[Design system compliance](#design-system-compliance).

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + TypeScript (strict) + Vite, plain CSS driven by design tokens |
| Backend | Node + Express + TypeScript (strict), zod validation |
| Database | SQLite (`better-sqlite3`), file-backed in `data/` |
| Auth | Email + password (bcrypt), JWT bearer tokens |
| Reports | CSV generated in-process, PDF via `pdfkit` |

## Getting started

```bash
npm install
npm run seed          # creates data/onboarding-diary.db with demo users and entries
npm run dev:server    # API on http://localhost:4000
npm run dev:web       # UI on http://localhost:5173 (proxies /api to the server)
```

Demo accounts (password `password123`):

| Email | Role |
| --- | --- |
| `recruit@example.com` | New recruit (Nimal Perera) |
| `recruit2@example.com` | New recruit (Ayesha Silva) |
| `manager@example.com` | Manager of both recruits |
| `admin@example.com` | Admin |

Other scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run format`.

## Features

- **Authentication & profile** — sign up / sign in, profile with name, role, department, start date
  and manager.
- **Task log** — CRUD with date, title, description, category, status, priority; filter by date
  range, category and status.
- **Issue log** — CRUD with severity, status and resolution notes; filter by date range, severity
  and status.
- **Feedback** — Positive / Suggestion / Concern entries with details.
- **Notes** — free-form notes with date, title, content and tags.
- **Dashboard** — summary counts, task completion rate, open issues, recent entries, and charts for
  tasks by status, issues by severity and daily activity. Managers can switch between recruits.
- **Reports** — date-range reports (tasks, issues, feedback or combined) downloadable as PDF or CSV;
  managers can report on the recruits they oversee.
- **Extensions** — cross-category **search** and the **manager dashboard/report scoping** described
  above (see [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md)).

## Roles and visibility

| Role | Sees |
| --- | --- |
| Recruit | Only their own entries |
| Manager | Their own entries plus those of recruits whose `managerId` is the manager |
| Admin | All users and all entries |

Writes are always limited to the author (admins may also edit and delete any entry).

## API

All endpoints are under `/api`; every route except `auth/signup`, `auth/login` and `health`
requires an `Authorization: Bearer <token>` header.

| Method & path | Purpose |
| --- | --- |
| `POST /api/auth/signup` | Create an account, returns a token |
| `POST /api/auth/login` | Sign in, returns a token |
| `GET /api/auth/me` | Current user |
| `PATCH /api/auth/me` | Update profile |
| `GET /api/users` | Users visible to the actor |
| `GET /api/users/managers` | Managers and admins, for the profile selector |
| `DELETE /api/users/:id` | Admin only |
| `GET/POST /api/{tasks,issues,feedback,notes}` | List (filters: `from`, `to`, `userId`, `q`, plus per-resource fields) and create |
| `PATCH/DELETE /api/{tasks,issues,feedback,notes}/:id` | Update / delete |
| `GET /api/dashboard` | Counts, breakdowns, recent entries, activity series |
| `GET /api/search?q=` | Cross-category search |
| `GET /api/reports?type=&format=&from=&to=&userId=` | `format` is `json`, `csv` or `pdf` |

## Design system compliance

- `web/src/styles/index.css` imports `devin_context/design-system/tokens.css` and is written
  exclusively in `var(--token)` references — no raw hex, font size, radius, shadow or spacing value
  appears in any component.
- `Button`, `Input`, `Textarea` and `Dropdown` implement the props and every state (default, hover,
  focus, active, disabled, error) defined in `devin_context/design-system/components/`.
- `/style-guide` in the running app renders the palette, type scale, all five button variants with
  their inactive state, the dropdown panel and the input default/error/active/disabled states — a
  live comparison against `devin_context/design-system/reference/uidesigndaily-day-805-style-guide.png`.
