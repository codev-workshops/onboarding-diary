# Onboarding Diary

Runnable account, administration, diary, dashboard, and reporting slices for the Onboarding Diary application.

## Prerequisites

- Python 3.12+
- Node.js 20+
- npm 10+

The backend intentionally uses one process and one in-memory SQLite database. All users, sessions, assignments, tasks, and issues are lost whenever the backend restarts.

## Install

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

On macOS or Linux, activate the environment with `source .venv/bin/activate`.

### Frontend

```powershell
cd frontend
npm ci
```

## Start

Start the backend from the repository root:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = "change-me-now"
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

On macOS or Linux:

```bash
export BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
export BOOTSTRAP_ADMIN_PASSWORD="change-me-now"
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

The backend refuses to start if either bootstrap variable is absent or invalid. Each startup creates one Admin with the supplied email, the name `Bootstrap Admin`, department `Administration`, and the current UTC date.

In another terminal:

```powershell
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to FastAPI so cookies and mutating requests remain same-origin.

## Checks

With the backend virtual environment active:

```powershell
python -m pytest backend/tests
cd frontend
npm run lint
npm run build
npm run test:e2e
```

The Playwright command starts both servers with isolated local bootstrap values. Install its browser once with `npx playwright install chromium`.

## API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/health`
- `GET/POST /api/admin/users`
- `GET/PATCH/DELETE /api/admin/users/{user_id}`
- `PUT/DELETE /api/admin/recruits/{recruit_id}/manager`
- `GET /api/diary/recruits`
- `GET /api/dashboard`
- `GET /api/reports?recruit_id={id}&type={tasks|issues|feedback|combined}&start_date={date}&end_date={date}&format={pdf|csv}`
- `GET/POST /api/tasks`
- `GET/PATCH/DELETE /api/tasks/{task_id}`
- `GET/POST /api/issues`
- `GET/PATCH/DELETE /api/issues/{issue_id}`
- `GET/POST /api/feedback`
- `GET/PATCH/DELETE /api/feedback/{feedback_id}`
- `GET/POST /api/notes`
- `GET/PATCH/DELETE /api/notes/{note_id}`

Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes with 310,000 iterations. Login uses an opaque server-side session in an eight-hour `HttpOnly`, `SameSite=Lax` cookie.

Public sign-up always creates a Recruit. Admins create Manager/Admin users and maintain each Recruit's optional single Manager assignment. Role changes invalidate the affected user's sessions and remove invalid assignments.

Recruit diary operations are scoped to self. Managers select an assigned Recruit, and Admins may select any Recruit. Task filters support date, category, and status; issue filters support status and severity. Feedback types are Positive, Suggestion, or Concern; note tags are normalized to trimmed, lowercase, unique values.

Reports cover one authorized Recruit over an inclusive date range. Recruits can export their own data, Managers can export assigned Recruit data, and Admins can export any Recruit data as CSV or PDF.
