# Operations & Security Guide

For anyone deploying or managing the Onboarding Diary. It explains the two modes,
the single `DB_STRING` switch, the running processes, and the security model.
Authoritative decisions live in [ASSUMPTIONS.md](ASSUMPTIONS.md) §13 and §23; this
document is the practical summary. Testing is covered in
[TESTING_STRATEGY.md](TESTING_STRATEGY.md).

## The one switch: `DB_STRING`

Mode is derived from a single operator-facing environment variable — the
production PostgreSQL connection string. **There is no `DEMO_MODE` flag.**

| `DB_STRING` | Mode           | Datasource              | Demo accounts / tour | `/api/config/demo` |
| ----------- | -------------- | ----------------------- | -------------------- | ------------------ |
| **absent**  | **demo**       | SQLite (`DATABASE_URL`) | seeded / on          | served             |
| **present** | **production** | PostgreSQL              | never / off          | 404                |

- `demoMode = !DB_STRING`. Presence of `DB_STRING` **always** means production;
  there is no fallback from production back to demo.
- `DATABASE_URL` is only the internal SQLite datasource for demo/tests — not the
  production switch.

## Running processes

There are three processes; **which run depends on the mode**.

### Demo mode (evaluation / first use)

| Process        | Command                          | Port | Purpose                                                                                                            |
| -------------- | -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| API server     | `npm run dev --workspace server` | 4000 | Data API on SQLite; serves demo data, tour config, and demo credentials.                                           |
| Client SPA     | `npm run dev --workspace client` | 5173 | React SPA; proxies `/api` to the server.                                                                           |
| **Setup tool** | `npm run setup`                  | 4100 | **One-off**, demo-only. Serves the "Move to production" form and performs the cutover. Not part of normal running. |

`npm run dev` starts the API + client together. Start the setup tool **only** when
you are ready to cut over to production.

### Production mode (real customer)

| Process    | Command                                    | Port | Purpose                                                            |
| ---------- | ------------------------------------------ | ---- | ------------------------------------------------------------------ |
| API server | `npm run start --workspace server` (built) | 4000 | Data API on PostgreSQL. Read/validate only — **never** provisions. |
| Client SPA | Served as static assets (`client` build)   | —    | Built SPA behind your web server/CDN.                              |

The **setup tool does not run in production** — it refuses to start (and returns 403) if `DB_STRING` is set. See the cutover below.

## Demo → production cutover

Provisioning is an **explicit, interactive, one-off action done from demo mode** —
never something the API server does on boot (ASSUMPTIONS §23).

1. In demo mode, start the setup tool: `npm run setup` (or click "Move to
   production" on the Admin overview). Open `http://localhost:4100`.
2. Enter the PostgreSQL connection string, the first administrator
   (email/name/password), and an optional timezone. The tool:
   - applies the production schema,
   - seeds **only** default task categories (no departments/users/entries),
   - creates the first Admin (bcrypt-hashed) **only if none exists** — it never
     resets an existing admin's password,
   - sets the one-way latch `Setting.mode=production`,
   - is additive and idempotent (no destructive deletes),
   - **on-prem**, writes `DB_STRING` + a generated strong `JWT_SECRET` to
     `server/.env` (mode `0600`; the admin password is never written).
3. **Persist `DB_STRING` for the environment.** Setting the env var is the
   canonical mechanism (works on-prem and cloud). The `.env` write is an on-prem
   convenience only — on cloud the filesystem is ephemeral/read-only, so set
   `DB_STRING` and `JWT_SECRET` in the platform's environment settings. The tool
   shows the values to set (a freshly-generated `JWT_SECRET` is shown once; copy it).
4. **Restart the API server** (it selects its datasource at startup) and **stop the
   setup tool**. On restart, `DB_STRING` is present ⇒ production, and the startup
   guards confirm the DB is provisioned.

Because provisioning is interactive, run it once against your (cloud) Postgres from
a machine where an operator can interact — local, a bastion, or a one-off task —
then deploy the server pointing `DB_STRING` at that same database.

## Security model

- **One-way to production.** The authoritative latch is a DB row
  (`Setting.mode=production`), not an env var — so removing `DB_STRING` cannot
  silently drop a provisioned Postgres back to demo, and the switch behaves the same
  on cloud and on-prem.
- **Demo credentials never reach production.** The `@demo.local` accounts and the
  shared demo password are seeded **only** in demo mode. Production is never seeded
  with them, and, as defense in depth, the API **refuses to authenticate any
  `@demo.local` email** in production even if such a row somehow exists.
  `GET /api/config/demo` (which broadcasts the demo password) returns 404 in
  production.
- **Startup guards (production).** The server refuses to boot if `JWT_SECRET` is the
  placeholder or shorter than 16 characters, or if the target DB is not provisioned
  (no schema, no `Setting.mode=production` latch, or no Admin). It fails fast with a
  clear message rather than re-provisioning or falling back to demo.
- **Minimal attack surface.** The always-on API server has **no** provisioning code
  path — it cannot create schema, mint an admin, or write `.env`. All of that lives
  in the separate setup tool, which only runs in demo mode.
- **Secret handling.** Passwords are bcrypt-hashed; the admin plaintext is never
  written to `.env`, logs, or the database. The setup tool never logs DB strings or
  secrets, never echoes the DB string back, and returns a generated `JWT_SECRET`
  only when freshly generated (for cloud operators to copy), never a reused one.
  `.env` is written `0600` and is gitignored.
- **Where to keep secrets.** Prefer platform-injected environment variables (or a
  secret manager) over a file on disk. If using `.env` on-prem, keep it outside any
  repo, `0600`, owned by the service user. Use a least-privilege Postgres user and
  rotate credentials.
- **Setup tool exposure.** Run it only during cutover, bound to the local machine,
  and stop it immediately afterward. It refuses to operate once `DB_STRING` is set.
