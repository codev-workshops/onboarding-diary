# Onboarding Diary — Phase 1 E2E Test Report

**Date:** 2026-06-18
**Scope:** Phase 1 MVP — authentication + profile (React frontend against live Spring Boot backend + seeded Postgres)
**Result:** 5/5 passed

| # | Test | Result |
|---|------|--------|
| 1 | Invalid credentials show a generic error and stay on login | PASS |
| 2 | Valid admin login redirects to profile | PASS |
| 3 | Profile name + department update succeeds | PASS |
| 4 | Profile changes persist after reload | PASS |
| 5 | Sign out + protected-route guard redirects to login | PASS |

Backend run with `SEED_ENABLED=true` (seeded admin `admin@onboardingdiary.local`). Automated suites also pass: backend 28 tests (`mvn verify`), frontend Vitest + lint + build.

---

## 1. Login page renders

![Login page](/home/ubuntu/screenshots/ss_12e7fde9.png)

## 2. Invalid credentials rejected (generic message, 401)

Entered the admin email with a wrong password — backend returns 401 with a generic message (no user enumeration), UI stays on login.

![Invalid login error](/home/ubuntu/screenshots/ss_47cc036d.png)

## 3. Valid admin login → profile page

Redirected to `/profile`; read-only block shows email, `ADMIN` role, `ACTIVE` status.

![Profile after login](/home/ubuntu/screenshots/ss_265747f6.png)

## 4. Profile update succeeds

Changed name to "Default Admin (Edited)" and department to "People Operations"; `PUT /me` succeeds and the "Profile updated" confirmation shows.

![Profile updated](/home/ubuntu/screenshots/ss_33ee7af6.png)

## 5. Changes persist after reload

Hard reload (F5) re-fetches via `GET /me` using the stored JWT; edited values persist.

![Persisted after reload](/home/ubuntu/screenshots/ss_b58b49b1.png)

## 6. Sign out + route guard

After "Sign out", navigating directly to `/profile` redirects to `/login` (token cleared, protected route enforced).

![Redirected to login after logout](/home/ubuntu/screenshots/ss_f93465e5.png)
