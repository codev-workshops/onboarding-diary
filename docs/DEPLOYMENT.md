# Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│   Nginx (web)│────▶│  Express (api)│
│              │     │   port 80    │     │   port 3000  │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │  PostgreSQL   │
                                          │   port 5432   │
                                          └──────────────┘
```

- **web**: Nginx serving the React SPA, proxying `/api/*` to the backend
- **api**: Node.js Express server with Prisma ORM
- **postgres**: PostgreSQL 16 database

## Quick Start (Docker Compose)

### Prerequisites

- Docker 24+ and Docker Compose v2
- At least 2 GB free RAM

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/codev-workshops/onboarding-diary.git
cd onboarding-diary

# 2. Create production environment file
cp .env.production.example .env.production

# 3. Generate secrets and edit .env.production
openssl rand -base64 48  # Use for JWT_ACCESS_SECRET
openssl rand -base64 48  # Use for JWT_REFRESH_SECRET
# Set POSTGRES_PASSWORD to a strong password
# Set CORS_ORIGIN to your domain

# 4. Run database migrations
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate

# 5. Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 6. (Optional) Seed sample data
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  npx prisma db seed --schema apps/api/prisma/schema.prisma
```

The application is now available at `http://localhost` (or the `APP_PORT` you configured).

### Verify Deployment

```bash
# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# Check API health
curl http://localhost/api/v1/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "version": "0.1.0",
#   "uptime": 42.5,
#   "checks": { "database": "healthy" }
# }
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_DB` | No | `onboarding_diary` | Database name |
| `POSTGRES_USER` | No | `postgres` | Database user |
| `POSTGRES_PASSWORD` | **Yes** | — | Database password |
| `JWT_ACCESS_SECRET` | **Yes** | — | JWT signing key (min 32 chars) |
| `JWT_REFRESH_SECRET` | **Yes** | — | Refresh token signing key (min 32 chars) |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token TTL |
| `CORS_ORIGIN` | No | `http://localhost` | Allowed origin(s), comma-separated |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt cost factor |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `APP_PORT` | No | `80` | Host port for web container |

## Docker Images

### Backend (`apps/api/Dockerfile`)

Multi-stage build:
1. **Builder**: Installs dependencies, generates Prisma client, compiles TypeScript
2. **Runner**: Alpine Node 20, runs compiled JS with `dumb-init` as PID 1

Features:
- Non-root user (`appuser:1001`)
- `dumb-init` for proper signal forwarding
- Health check via `wget` to `/api/v1/health`
- Prisma schema included for runtime migrations

### Frontend (`apps/web/Dockerfile`)

Multi-stage build:
1. **Builder**: Installs dependencies, builds Vite production bundle
2. **Runner**: Nginx Alpine serving static files

Features:
- Non-root user (`nginx`)
- SPA fallback routing (`try_files $uri /index.html`)
- Gzip compression enabled
- Static asset caching (1 year, immutable)
- API proxy to backend container
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

## Health Checks

| Service | Endpoint | Interval | Details |
|---------|----------|----------|---------|
| PostgreSQL | `pg_isready` | 10s | Native readiness check |
| API | `GET /api/v1/health` | 30s | Returns DB connectivity status |
| Web | `GET /` | 30s | Nginx serving check |

The API health endpoint returns a `checks` object showing subsystem status:
- `200 OK` — all systems healthy
- `503 Service Unavailable` — database unreachable (status: `degraded`)

## Security

### Already Implemented

| Feature | Implementation |
|---------|---------------|
| **Security headers** | Helmet middleware (CSP, HSTS, X-Frame-Options, etc.) |
| **Rate limiting** | Global (100/min) + auth-specific (10/15min) via `express-rate-limit` |
| **CORS** | Configurable allowed origins with credentials support |
| **JWT auth** | Access + refresh token rotation, bcrypt password hashing |
| **Input validation** | Zod schemas on all endpoints |
| **Non-root containers** | Both API and web run as unprivileged users |
| **Graceful shutdown** | SIGTERM/SIGINT handlers in Express server |
| **Soft delete** | Data preservation via `deletedAt` timestamps |
| **Request tracing** | Unique `X-Request-ID` on every request |

### Production Recommendations

- **TLS**: Place a reverse proxy (Cloudflare, AWS ALB, Caddy) in front for HTTPS termination
- **Secrets**: Use Docker secrets or a vault (e.g., AWS Secrets Manager) instead of `.env` files
- **Database backups**: Schedule `pg_dump` via cron or use managed PostgreSQL
- **Log aggregation**: Pipe Pino JSON logs to ELK, Datadog, or CloudWatch
- **Monitoring**: Use the health endpoint with uptime monitors (Uptime Robot, Healthchecks.io)

## Logging

The API uses **Pino** for structured JSON logging:

```json
{"level":30,"time":1716537600000,"pid":1,"hostname":"api","requestId":"abc-123","method":"GET","path":"/api/v1/tasks","statusCode":200,"durationMs":12}
```

- **Development**: Pretty-printed with colors via `pino-pretty`
- **Production**: Raw JSON (no transport configured) — pipe to your aggregator
- Configurable via `LOG_LEVEL` env var: `fatal`, `error`, `warn`, `info`, `debug`, `trace`

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on PRs:

```
lint-typecheck ──┐
                 ├──▶ build ──▶ docker (main only)
test ────────────┘
```

| Job | Description |
|-----|-------------|
| `lint-typecheck` | Runs ESLint and TypeScript compiler |
| `test` | Runs all Vitest tests (105 total) |
| `build` | Builds all packages (shared, api, web) |
| `docker` | Builds Docker images (only on `main` push) |

### Extending for Deployment

To push images to a registry and deploy, add to the `docker` job:

```yaml
- name: Log in to registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Push API image
  run: |
    docker tag onboarding-diary-api:${{ github.sha }} ghcr.io/${{ github.repository }}/api:${{ github.sha }}
    docker push ghcr.io/${{ github.repository }}/api:${{ github.sha }}

- name: Push Web image
  run: |
    docker tag onboarding-diary-web:${{ github.sha }} ghcr.io/${{ github.repository }}/web:${{ github.sha }}
    docker push ghcr.io/${{ github.repository }}/web:${{ github.sha }}
```

## Operations

### Updating

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# API only
docker compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### Database Backup

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres onboarding_diary > backup_$(date +%Y%m%d).sql
```

### Database Restore

```bash
cat backup_20260524.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres onboarding_diary
```

## Local Development (Non-Docker)

```bash
# Start only PostgreSQL
docker compose up -d

# Install dependencies
pnpm install

# Set up database
cp apps/api/.env.example apps/api/.env
pnpm db:migrate
pnpm db:seed

# Start dev servers
pnpm dev
# API: http://localhost:3000
# Web: http://localhost:5173
```
