---
name: identity-ui-testing
description: Run local Onboarding Diary identity UI validation with invited fixtures, role guards, responsive screenshots, and session recovery.
---

# Local identity UI testing

Run from the repository root unless stated otherwise.

## Devin Secrets Needed

None for local development. Use only the dev bootstrap credentials declared in
docker-compose.yml; never reuse them against hosted environments.

## Services

- `docker compose up --build -d --wait` starts Postgres and the backend on 8080.
- If Gradle plugin resolution fails in the container and the environment already
  provides `$HOME/.gradle/init.d/mirror.gradle.kts`, build using:
  `DOCKER_BUILDKIT=1 docker build --secret id=gradle-init,src="$HOME/.gradle/init.d/mirror.gradle.kts" -t onboarding-diary-backend backend`
  followed by `docker compose up --no-build -d --wait`.
  The image tag must match Compose's generated project/service image name.
- Run `npm run dev` in frontend; verify `.env` points
  NEXT_PUBLIC_API_BASE_URL to http://localhost:8080.
- Chrome should use localhost:3000 (not a separate origin), matching the local API configuration.

## Fixtures

Signup activates an existing INVITED user; it does not create one. For local-only
testing, insert a unique fixture using `docker compose exec -T postgres psql
-U onboarding -d onboarding_diary`. Relevant columns are email, password_hash
(NULL for INVITED), role, status, full_name, department, start_date.
Use V2__users.sql as the source of truth for constraints.

An ACTIVE manager fixture can copy the dev admin password_hash so the same known
dev password works; do not copy real production credentials.
Use a fresh fixture or reset only a known test fixture between activation runs.

## High-value checks

- Submit mixed-case/trailing-space invited email and inspect normalized profile.
- After login/activation, actually save profile edits and reload: a cached
  authenticated header alone does not prove protected API requests work.
- Change password, log out, verify the new password succeeds and the old fails.
- Recruit: Home/Profile; Manager: adds Team; Admin: adds Users.
  Team/Users may intentionally be placeholders in early slices.
- For invalid-token recovery, preserve sessionStorage `onboarding-diary.auth`
  JSON's `user` and `expiresAt`, replace only `token`, then hard-navigate to
  /profile. Expect /login and removal of that storage entry.
- Capture desktop and 360px states, including long form errors and stacked
  profile/password forms. Next.js dev indicator is not application UI.
- If auth fails unexpectedly after hot reload, clear the session and perform
  a fresh login before judging the updated behavior.
