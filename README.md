# Onboarding Diary

Runnable account and profile slice for the Onboarding Diary application.

## Prerequisites

- Python 3.12+
- Node.js 20+
- npm 10+

The backend intentionally uses one process and one in-memory SQLite database. All users and sessions are lost whenever the backend restarts.

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

Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes with 310,000 iterations. Login uses an opaque server-side session in an eight-hour `HttpOnly`, `SameSite=Lax` cookie.
