---
name: testing-onboarding-diary
description: How to run the Onboarding Diary stack locally and create Recruit/Manager/Admin test data for end-to-end UI testing.
---

# Testing the Onboarding Diary app

## Running the stack
- .NET SDK lives at `/home/ubuntu/.dotnet` — `export PATH=$PATH:/home/ubuntu/.dotnet` first.
- Backend: `cd backend/OnboardingDiary.Api && dotnet run` → http://localhost:5080 (Swagger at `/swagger`).
  It applies EF migrations and creates the SQLite file `backend/OnboardingDiary.Api/onboarding-diary.db` on startup.
- Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173 (talks to `VITE_API_BASE_URL`, default 5080).
- `scripts/dev.sh` starts both together.

## Accounts / test data
- The seeder ONLY creates an admin: `admin@onboarding.local` / `Admin#12345`. There are no demo
  Recruit/Manager accounts and no demo tasks/issues/feedback, so any dashboard test needs data seeded first.
- `POST /api/auth/signup` always creates a **NewRecruit** and auto-assigns `ManagerId` to the lowest-id
  existing Manager. To get a Manager/Admin you must edit the DB directly.
- The `Role` column is stored as the **enum name string** (`'NewRecruit'`, `'Manager'`, `'Admin'`), not an int —
  `UPDATE Users SET Role=1` silently breaks the row. Use:
  `UPDATE Users SET Role='Manager' WHERE Email=...;` and `UPDATE Users SET ManagerId=<mgrId> WHERE Role='NewRecruit';`
  Re-login after changing a role (the JWT carries the old role).
- Recommended seeding flow (plain python + urllib is enough):
  1. signup manager + recruits, 2. sqlite `UPDATE` for role + ManagerId, 3. log in as each recruit and
  `POST /api/tasks|/api/issues|/api/feedback|/api/notes` with varied `category`/`status`/`severity`/`type`
  and dates spread over the last ~8 weeks (the admin dashboard buckets activity into 8 weekly buckets).
- Enum values are sent as strings, e.g. task `{"date":"YYYY-MM-DD","title":...,"category":"Training",
  "status":"Completed","priority":"High"}`.

## Reaching the dashboards in the UI
- Role routing happens in `frontend/src/features/dashboard/dashboard-page.tsx`: with the app-bar
  "Viewing" selector set to **My diary**, Admin sees the Organisation dashboard, Manager sees the Team
  dashboard, everyone else sees the recruit dashboard. Picking a recruit in "Viewing" shows that recruit's
  dashboard for Manager/Admin.
- Theme toggle is the app-bar icon button with aria-label "Switch to dark theme"/"Switch to light theme";
  the preference is stored in `localStorage['onboarding-diary.theme']` and defaults to `system`.
- Note: the recruit selection lives in React state and is NOT cleared on sign-out, so after switching
  accounts in one browser session the previous recruit may still be selected — set it back to "My diary"
  before asserting on the Manager/Admin dashboards.

## Devin Secrets Needed
None — everything runs locally with the seeded admin account.
