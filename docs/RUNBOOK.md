# Deployment Runbook (T-194)

Covers building and running the production artefacts, the migration-on-deploy step, required
configuration, health checks, and what the logs should look like. Local development is in the
[README](../README.md); the architecture is in [TRD](./TRD.md) sections 7 and 9.

## Artefacts

| Image | Dockerfile              | Contents                                                        |
| ----- | ----------------------- | --------------------------------------------------------------- |
| api   | `deploy/api.Dockerfile` | Compiled `apps/api/dist` on Node 24; runs migrations then serves |
| web   | `deploy/web.Dockerfile` | Vite build served by nginx on `:8080`, proxying `/api` to the API |

Both build from the repository root:

```bash
docker build -f deploy/api.Dockerfile -t onboarding-diary-api:$(git rev-parse --short HEAD) .
docker build -f deploy/web.Dockerfile \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  -t onboarding-diary-web:$(git rev-parse --short HEAD) .
```

`VITE_API_BASE_URL` is compiled into the bundle, so it is a **build** argument. The default
`/api/v1` keeps the API same-origin behind nginx, which is what the HttpOnly, `SameSite=Strict`
refresh cookie needs (TRD 5.2). Only override it when the API lives on another origin, and then
set `WEB_ORIGIN` on the API to match.

`docker-compose.prod.yml` wires the two images plus PostgreSQL 16 and is the reference topology:

```bash
POSTGRES_PASSWORD=... JWT_SECRET=... WEB_ORIGIN=https://diary.example.com \
  docker compose -f docker-compose.prod.yml up -d --build
```

## Required configuration

| Variable                 | Service | Required | Notes                                              |
| ------------------------ | ------- | -------- | -------------------------------------------------- |
| `NODE_ENV`               | api     | set to `production` | Enables the `Secure` refresh cookie     |
| `DATABASE_URL`           | api     | yes      | PostgreSQL connection string                       |
| `JWT_SECRET`             | api     | yes      | ≥ 32 chars, rotate per environment                 |
| `WEB_ORIGIN`             | api     | yes      | Exact browser origin, used for CORS                |
| `ACCESS_TOKEN_TTL`       | api     | no       | Default `15m`                                      |
| `REFRESH_TOKEN_TTL_DAYS` | api     | no       | Default `14`                                       |
| `PORT`                   | api     | no       | Default `4000`                                     |
| `LOG_LEVEL`              | api     | no       | Default `info`                                     |
| `API_UPSTREAM`           | web     | no       | `host:port` nginx proxies to; default `api:4000`    |
| `VITE_API_BASE_URL`      | web     | build    | Default `/api/v1`                                   |

Configuration is validated by a Zod schema at startup; a missing or malformed value aborts the
process with the offending keys listed, so a bad deploy fails immediately instead of serving.
`TEST_DATABASE_URL` is only used by the integration tests and must never point at production.

## Deploy procedure

1. Build both images from the commit being released and push them to the registry.
2. Take a database snapshot (managed daily snapshots are the baseline; a pre-deploy one makes a
   rollback that touches the schema safe).
3. Start (or update) the API. Its entrypoint, `deploy/api-entrypoint.sh`, runs
   `prisma migrate deploy` before `node apps/api/dist/server.js`:
   - `migrate deploy` only applies committed migrations, never generates or resets one;
   - a failed migration exits non-zero, so the container never begins serving a half-migrated
     schema;
   - it is idempotent, so restarts and replicas are safe.
4. Wait for the API health check to pass, then start the web image. In Compose this is enforced
   by `depends_on: api: condition: service_healthy`.
5. Smoke-test (see below).

Because migrations are applied on start, expansion-only migrations (add nullable column, add
index, add table) deploy without a maintenance window. A destructive change must be split
across two releases: deploy the code that tolerates both shapes first, then the migration that
drops the old shape.

## First administrator

Signup always creates a `RECRUIT` (FR-A2), and only an admin can change roles, so a new
environment needs one promotion by hand:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

`npm run seed` is a development and demo fixture — it writes known passwords, so never run it
against production.

## Health checks and smoke test

`GET /health` returns `200` with `{"status":"ok","database":"up"}` once the process is listening and
the database answers; the API also
verifies the database with `SELECT 1` at startup and exits non-zero if it is unreachable. Point
the platform's liveness and readiness probes at it. Through nginx the same check is available at
`/health`.

```bash
curl -fsS https://diary.example.com/health   # 200 {"status":"ok","database":"up"}
curl -fsS -o /dev/null -w '%{http_code}\n' https://diary.example.com/        # 200, SPA shell
curl -fsS -o /dev/null -w '%{http_code}\n' https://diary.example.com/tasks   # 200, SPA fallback
curl -fsS -X POST https://diary.example.com/api/v1/auth/login \
  -H 'content-type: application/json' -d '{"email":"...","password":"..."}'
```

Verified against a fresh database: both migrations applied by the entrypoint, `/health` 200
through the API and through nginx, the SPA served at `/` and at the client route `/tasks`, and
`/api/v1/auth/login` returning a `401 INVALID_CREDENTIALS` envelope for a bad password.

## Logs

Structured single-line JSON from pino on stdout, one line per request plus one per handled
error:

```json
{"level":30,"time":1785090426512,"req":{"id":"ea1d8b21-...","method":"GET","url":"/health"},"userId":null,"res":{"statusCode":200},"responseTime":1,"msg":"GET /health 200"}
{"level":40,"time":1785090426596,"requestId":"66fc187c-...","route":"POST /api/v1/auth/login","code":"INVALID_CREDENTIALS","msg":"Email or password is incorrect"}
```

- Every request carries a `requestId`, echoed in the `x-request-id` response header and in the
  API error envelope, and shown by the UI's error states — so a user-reported reference maps
  straight onto a log line.
- `userId` is present once a request is authenticated.
- Expected levels: `30` (info) for requests, `40` (warn) for 4xx, `50` (error) for 5xx and
  startup failures. A 5xx never includes the internal message in the response body; the detail
  is in the log.
- Passwords, tokens, and cookie values are never logged.

Alert on: sustained level `50`, `/health` failing, migration failure at boot, and 5xx rate above
the normal noise floor.

## Rollback

1. Redeploy the previous image tag. The API re-runs `migrate deploy`, which is a no-op when no
   migrations are pending.
2. If the release included a migration that the previous code cannot tolerate, restore the
   pre-deploy snapshot — Prisma has no down-migrations in this project.
3. Confirm `/health` and the smoke test above, then investigate from the logs using the
   `requestId` of a failing request.

## Backups

Daily managed PostgreSQL snapshots with 7-day retention (TRD 7), plus the pre-deploy snapshot in
step 2 above. Restores are tested by pointing a staging API at a restored copy and running the
smoke test.
