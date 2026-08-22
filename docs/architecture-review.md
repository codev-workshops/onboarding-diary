# Architecture Review — Onboarding Diary Application

**Reviewer role:** Senior software architect
**Subject:** `onboarding-diary-specification.md` v1.0
**Purpose:** Determine what to build, in what order, for an interview exercise where the spec is the implementation contract
**Verdict:** Approve for implementation **with scope cuts**. The spec is correct and internally consistent; it is roughly 2.5× the volume an interview exercise should deliver. Nothing below removes a capability from the required MVP list — the cuts are to _depth_, not _breadth_.

---

## 1. Executive summary

### 1.1 What the spec gets right and must survive contact with the deadline

1. **The single authorisation choke point** (§11.2 `readable_user_ids` + `assert_can_write`). This is the architectural centre of the exercise. Everything else is CRUD. Keep it, test it first, and make it impossible to bypass.
2. **Scope enforced in SQL, not in application code after fetching.** This one decision is what makes IDOR structurally impossible and is the most likely thing a reviewer will probe.
3. **The 403/404 disclosure policy** (§11.7). It is deliberate and consistent; ad-hoc improvisation here reads as carelessness.
4. **DB constraints mirroring API validation** (§21.2). Cheap to write, demonstrates rigour, catches bugs the tests miss.
5. **Uniform entry shape across four types.** Task/Issue/Feedback/Note differ by ~4 fields each. One generic service + repository pattern gives four features for the price of one and a half. This is the single biggest schedule lever in the project.

### 1.2 The core risk

The spec's cost is concentrated in places that generate **no reviewer signal**: async report jobs, token-reuse-detection families, `token_epoch` invalidation, trigram search indexes, streak calculations, audit diffing on every entry write, print stylesheets. An implementer who works top-to-bottom through the document will spend the first third of their time on authentication plumbing and arrive at the reporting section — the second-most-interesting part of the brief — with nothing to show.

**Sequencing recommendation: build one vertical slice end-to-end (auth → authz → tasks → dashboard tile → CSV) before building the second entry type.** A thin working application beats three deeply-built layers that do not yet meet.

### 1.3 Effort shape

Against the full spec, this is roughly **3 sessions** of my own throughput. Against the MVP defined in §4 below, it is **~1 session** for a demonstrable end-to-end application, plus a second for Phase 2 polish. The milestones in §12 are sized so that each one ends at a demoable state.

---

## 2. Requirements essential to the MVP

These carry the interview. Each is justified by the signal it produces.

| #   | Requirement                                                                                     | Spec ref     | Why essential                                                                                     |
| --- | ----------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| E1  | Email/password auth with hashed passwords and a real session mechanism                          | §10          | Table stakes; also the precondition for every authz demo                                          |
| E2  | Three roles, server-enforced                                                                    | §8, §11      | Explicitly required                                                                               |
| E3  | `readable_user_ids(actor)` applied in the query builder for every entry read                    | §11.2        | The architectural thesis of the whole exercise                                                    |
| E4  | Manager scope: direct reports only, live-evaluated                                              | §11.4        | The brief calls this out twice; it is the graded requirement                                      |
| E5  | Recruit privacy: hard filter to self, 404 on foreign ids                                        | §11.5        | Same                                                                                              |
| E6  | Task + Issue + Feedback + Note CRUD with soft delete                                            | §4.2–4.5     | Required                                                                                          |
| E7  | Filters: tasks by date/category/status; issues by status/severity                               | §4.3, §4.4   | Named explicitly in the brief                                                                     |
| E8  | Issue resolution workflow (status + resolution notes; manager may update those two fields only) | §11.3, FR-I3 | The one genuinely interesting write-authorisation rule — a field-level, not row-level, permission |
| E9  | Dashboard: summary counts, recent entries, task completion %, open issues                       | §16.2        | Required, and the four named widgets are exactly what should be built                             |
| E10 | Reports over a date range for tasks/issues/feedback/combined, authorised per §17.3              | §17          | Required                                                                                          |
| E11 | PDF **and** CSV export, scope-filtered by the same query builder                                | §18          | Required; the "same query builder" clause is what prevents an export-path data leak               |
| E12 | PostgreSQL with FKs, enums, indexes, migrations, seed data                                      | §21          | "Persistent database storage" + reviewability                                                     |
| E13 | Responsive UI, 320 px → desktop, tables → cards on mobile                                       | §25          | Required                                                                                          |
| E14 | Automated authorisation tests covering §11.4 AZ-M1…M10 and §11.5 AZ-R1…R6                       | §20 SEC-23   | Required, and the cheapest credibility in the project                                             |
| E15 | Consistent error envelope + the 403/404 policy                                                  | §19.1, §11.7 | Without one envelope the front end grows per-endpoint error handling                              |
| E16 | Pagination + sorting on all list endpoints                                                      | §23          | Trivial to add up front, painful to retrofit into the UI                                          |
| E17 | Soft delete on entries                                                                          | FR-E3        | Two columns; makes "deleted data disappears from reports" demonstrable                            |
| E18 | Seeded demo data with two managers whose recruits interleave                                    | §21.5        | You cannot _demonstrate_ scope enforcement without out-of-scope fixtures                          |

**E18 deserves emphasis.** A seed with one manager and three recruits cannot show that scope works. Seed two managers × three recruits + one unassigned recruit, and give the reviewer three demo logins.

---

## 3. Valuable but deferrable

Correct requirements whose absence does not weaken the demo. Defer, and say so in the README — a documented deferral is engineering judgement; an undocumented gap is an oversight.

| #   | Requirement                                                                | Spec ref     | Defer because                                                                                                                                         | Cost to add later                          |
| --- | -------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| D1  | Refresh-token rotation + reuse-detection families                          | §10.1        | A single session token with a sane TTL demonstrates the same competence                                                                               | Medium — isolated in the auth module       |
| D2  | `token_epoch` immediate privilege invalidation                             | §10.4        | Only matters within the 15-min access-token window; a short TTL plus a per-request DB check of `is_active`/`role` gets 90 % of the value for one line | Low                                        |
| D3  | Optimistic concurrency (`version` + `If-Match` + `409 STALE_WRITE`)        | §4.6         | Single-author entries; concurrent edits are near-impossible in the demo. **Keep the `version` column**, skip the enforcement                          | Very low if the column exists from day one |
| D4  | Audit log **UI** (`/admin/audit`)                                          | §14 S-22     | Writing audit rows is the valuable half; a viewer is another CRUD screen                                                                              | Low                                        |
| D5  | Full audit coverage of every entry create/update                           | §22.1        | Audit only what matters: auth events, user/role/manager changes, cross-user entry mutations, report generation, authz denials                         | Low                                        |
| D6  | Forgot/reset password flow                                                 | §12.3        | No mail provider (A-16); admin-initiated reset covers it                                                                                              | Low                                        |
| D7  | Admin-created users with temporary passwords                               | §13.5        | Self sign-up + an admin role/manager editor covers user management                                                                                    | Low                                        |
| D8  | Department CRUD screen                                                     | §14 S-21     | Seed 4 departments; expose them read-only in the profile form. **Keep the entity and FK**                                                             | Low                                        |
| D9  | Text search (`q`) with pg_trgm                                             | §23.4        | Named filters are what the brief requires; search is extra                                                                                            | Low — one `ILIKE` to start                 |
| D10 | `activity_by_day`, `streak_days`, charts                                   | §16.2        | Nice dashboard garnish; the four required widgets carry the requirement                                                                               | Low                                        |
| D11 | Report `group_by`, per-section filters, "since start date" per-user ranges | §17.1        | Date range + section selection satisfies the brief                                                                                                    | Medium                                     |
| D12 | `ReportRun` persistence + `/reports/history`                               | §17.3        | Valuable for audit, invisible in a demo. Keep the _denied-attempt_ audit row                                                                          | Low                                        |
| D13 | Rate limiting / lockout                                                    | §10.3        | Real requirement, zero demo value; an in-memory limiter on `/auth/login` is a 20-line stub                                                            | Low                                        |
| D14 | Bulk delete, `Idempotency-Key`, `/meta/enums`                              | §12.5, §19.3 | Conveniences                                                                                                                                          | Very low                                   |
| D15 | Print stylesheet, PDF charts, tagged-PDF accessibility                     | §18.2, §25.2 | Polish                                                                                                                                                | Low                                        |
| D16 | Feedback `ADMIN_ONLY` visibility                                           | §8           | Keep the column and default; skip the UI toggle and the "n entries withheld" footer                                                                   | Very low                                   |
| D17 | `/history` unified timeline screen                                         | §14 S-14     | Duplicates the four list screens                                                                                                                      | Low                                        |

---

## 4. Over-engineered for this exercise — simplify

Each row states the **trade-off explicitly**, as requested.

| #   | Spec requirement                                                                                                                                                | Simplification                                                                                                                                                                                                                                                                                                                                | Trade-off accepted                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | Access JWT (15 min) + rotating opaque refresh token, hashed, in a family table, `SameSite` split by path, `token_epoch`, CSRF double-submit (§10.1, §20 SEC-04) | **One** `HttpOnly; Secure; SameSite=Lax` session cookie, 8-hour TTL, either a signed JWT or an opaque session row. Keep `HttpOnly` + `SameSite`. Keep CSRF protection only if you allow cross-site form posts — with `SameSite=Lax` and a JSON-only API, document the reliance on `SameSite` + a `Content-Type: application/json` requirement | Loses fine-grained revocation and short-window compromise limits. Acceptable: a stolen cookie is valid for 8 h instead of 15 min in a demo app with no real data. **Not** acceptable in production — say so in the README               |
| O2  | 20+ audit action types with before/after jsonb diffs on every write (§22)                                                                                       | 6 actions: `AUTH.LOGIN_*`, `USER.ROLE_CHANGED`, `USER.MANAGER_CHANGED`, `ENTRY.CROSS_USER_UPDATED`, `REPORT.GENERATED`, `AUTHZ.DENIED`. Keep the table shape unchanged                                                                                                                                                                        | Loses full change forensics on ordinary entry edits. Keeps every event that matters for a security story. Adding actions later is one enum value each                                                                                   |
| O3  | Async report jobs above 3 000 rows, polling endpoint, download URLs (§17.5)                                                                                     | Synchronous only, with the row caps enforced (`422 REPORT_TOO_LARGE`)                                                                                                                                                                                                                                                                         | Loses large-report support. The caps make the failure mode explicit rather than a timeout. The async path is already specified, so this is a pure deferral                                                                              |
| O4  | `POST /reports/preview` **and** `POST /reports/export` as separate endpoints (§12.7)                                                                            | One `POST /reports` with `format: JSON\|PDF\|CSV` deciding the response type                                                                                                                                                                                                                                                                  | Slightly muddier content negotiation. Removes an entire duplicated request path and guarantees preview and export return identical rows — which is a _correctness_ gain, not just a saving                                              |
| O5  | Four near-identical entry APIs hand-written (§12.5)                                                                                                             | One generic `createEntryRouter(config)` factory + one scoped repository, parameterised by a per-type Zod schema, sortable-field list and filter map                                                                                                                                                                                           | Slightly more indirection to read. Guarantees the authorisation filter is identical across all four types — the failure mode this prevents (notes list forgetting the owner filter) is exactly the bug being tested for                 |
| O6  | `citext`, `pg_trgm`, `pgcrypto`, array columns, partial indexes on every table, GIN indexes (§21.2)                                                             | Keep `pgcrypto`/`gen_random_uuid` and the partial `owner_id`-leading indexes on the two hot tables. Drop `pg_trgm` (with D9), store email lowercased in a `text` column with a unique index, keep `tags text[]` with its GIN index                                                                                                            | Loses case-insensitive email matching by the database — enforce lowercasing at one point in the auth service instead. Small correctness risk if that normalisation is bypassed; mitigate with a `CHECK (email = lower(email))`          |
| O7  | Full ER/audit/report metadata modelled before any feature works                                                                                                 | Ship the 6 core tables in migration 1 (`departments`, `users`, four entry tables); add `audit_logs` in migration 2                                                                                                                                                                                                                            | Two migrations instead of one. Gets a working vertical slice sooner and demonstrates that migrations are real                                                                                                                           |
| O8  | NFR-01…NFR-05 latency/scale targets, connection-pool sizing, statement timeouts, backup RPO/RTO (§5, §21.5)                                                     | Delete the numeric targets from the contract; retain the two design rules that produce them: **no N+1 in dashboards** and **every list query index-backed**. Keep them as a "Production readiness" README section                                                                                                                             | Loses provable performance claims. You cannot meaningfully load-test an interview app, and unverified NFRs in a contract are worse than none                                                                                            |
| O9  | `403 UNKNOWN_QUERY_PARAM` / `422 UNKNOWN_FIELD` strictness everywhere (§12.1, §23.2)                                                                            | Keep strict **body** schemas (mass-assignment defence, genuinely security-relevant). Relax unknown _query params_ to ignored-with-a-warning-log                                                                                                                                                                                               | Loses early detection of client filter typos. Strict query rejection breaks innocuous things like analytics params and adds friction with no security benefit — the authorisation filter is applied regardless of what the client sends |
| O10 | 24 screens including `/history`, `/reports/history`, `/admin/audit`, `/admin/departments` (§14)                                                                 | 14 screens: login, signup, dashboard, 4 list screens (+ modal forms), team roster, team member detail, reports, profile, admin users, 403/404                                                                                                                                                                                                 | Fewer surfaces to polish. Every removed screen is either a duplicate view of existing data or admin CRUD over seeded reference data                                                                                                     |
| O11 | WCAG 2.1 AA as a hard gate (NFR-07)                                                                                                                             | Keep the cheap 80 %: semantic HTML, labelled inputs, visible focus, keyboard-operable dialogs, contrast — all free via Radix/shadcn. Drop the formal audit and live-region choreography                                                                                                                                                       | Loses a compliance claim. State it as "accessible by construction, not formally audited"                                                                                                                                                |
| O12 | Docker Compose + Testcontainers + 5-stage CI + dependency scanning (§28)                                                                                        | Compose for app + Postgres; CI = lint → typecheck → test → build against a Postgres service container. Drop Testcontainers                                                                                                                                                                                                                    | Loses per-suite DB isolation. A CI service container plus per-test transaction rollback is simpler and sufficient                                                                                                                       |
| O13 | Entry `description` limits of 5 000 / note `content` 20 000, `q` min 2 chars, 256 KB body cap, JSON depth 20 (§9, §20 SEC-21)                                   | Keep the field length limits (they are DB constraints anyway). Keep a body-size cap via framework default; drop bespoke depth checking                                                                                                                                                                                                        | Negligible                                                                                                                                                                                                                              |

**One thing I would _not_ simplify that looks tempting:** the `owner_id`-leading partial indexes. They cost one line each and they are the visible evidence that the authorisation filter and the query plan were designed together.

---

## 5. Contradictions, ambiguities and complexity traps

### 5.1 Genuine contradictions in the spec — resolve before coding

| #   | Issue                                                                                                                                                                                                                                                                            | Where             | Resolution                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **`task_done_ts` CHECK vs. `completed_at` semantics.** The constraint `CHECK ((status='DONE') = (completed_at IS NOT NULL))` makes it impossible to record a task that was completed and later cancelled, and forces the service to null the column on every non-DONE transition | §21.2 vs FR-T3    | Keep the trigger behaviour in the service; **relax the constraint** to `CHECK (status <> 'DONE' OR completed_at IS NOT NULL)`. One-way constraints are safer than biconditional ones                                                                       |
| C2  | **`issue_resolved_ts` biconditional has the same defect**, and worse: FR-I4 permits `CLOSED → OPEN`, which must then null `resolved_at`, destroying resolution history                                                                                                           | §21.2 vs FR-I4    | Same relaxation. If resolution history matters, that is an issue-events table — Phase 3                                                                                                                                                                    |
| C3  | **Task completion % is defined twice.** FR-T4 says `DONE / all non-deleted`; §16.2 says `DONE / (total − CANCELLED)`                                                                                                                                                             | FR-T4 vs §16.2    | §16.2 wins. Delete the FR-T4 formula, keep the cross-reference. Implement it **once**, in one SQL expression used by dashboard and report alike                                                                                                            |
| C4  | **"Combined" is both a section value and a section set.** §17.1 lists `sections: [TASKS\|ISSUES\|FEEDBACK\|NOTES]` but FR-R2 allows `COMBINED` as a value                                                                                                                        | FR-R2 vs §17.1    | Drop `COMBINED` from the wire format. The UI offers a "Combined" preset that expands client-side to all permitted sections. Removes a server-side special case                                                                                             |
| C5  | **Manager report default is under-specified and dangerous.** §17.3 says `USERS` with no `user_ids` means "all in-scope recruits", while §17.3 also forbids silent narrowing                                                                                                      | §17.3             | Keep both, but make the _response_ echo `scope.users[]` explicitly and render it in the PDF header, so "all my recruits" is never ambiguous about who it covered                                                                                           |
| C6  | **Entry date lower bound depends on the owner's `start_date`** (`≥ start_date − 30d`), so validity changes retroactively when an admin edits a start date, and admin backfill for another user needs that user loaded                                                            | §9.3              | Keep the rule for the current user only; skip it for admin-authored entries. Or drop the lower bound entirely and keep only "not in the future" — I recommend this for MVP: it is one rule, easy to explain, and the 1990 floor already prevents absurdity |
| C7  | **Managers cannot see recruit emails (SEC-18) but the team roster and reports identify recruits.** Fine — but `GET /users` for a manager must then return a _different serialiser_ than for an admin, which is easy to get wrong                                                 | SEC-18 vs §12.4   | Implement two explicit DTOs (`UserSummary` without email, `UserAdmin` with). Never conditionally delete a field from one object — build the right object                                                                                                   |
| C8  | **`DELETE` idempotency vs. 404 policy.** §19.3 says deleting an already-deleted entry returns `204`; §11.3 says an invisible entry returns `404`. For a _foreign_ deleted entry these collide                                                                                    | §19.3 vs §11.3    | Authorisation first: not-visible → `404`; visible-but-already-deleted → `204`                                                                                                                                                                              |
| C9  | **`GET /departments` is authenticated-only, but `/signup` needs the department list**                                                                                                                                                                                            | §11.8 vs §14 S-02 | Make `GET /departments` public (it is non-sensitive reference data), or make `department_id` optional at signup and set it in the profile                                                                                                                  |
| C10 | **Feedback is manager-visible by default (A-03) while the report footer must count withheld `ADMIN_ONLY` entries (§17.3)** — that count itself leaks the existence of admin-only feedback to the manager                                                                         | §17.3             | Drop the withheld count from manager reports. Silence is the correct behaviour for a confidentiality boundary                                                                                                                                              |

### 5.2 Ambiguities to pin down (cheap decisions, expensive if deferred)

| #   | Ambiguity                                                                         | Recommended decision for the exercise                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Can a **manager** own entries, and do they appear in their own team roster?       | Yes they can own entries (A-01); exclude self from the roster; include self in `readable_user_ids`                                                                                                                |
| A2  | Does a manager's report over "all my recruits" include the manager's own entries? | No. `USERS` scope = recruits only; `SELF` is a separate scope                                                                                                                                                     |
| A3  | What does a recruit with **no manager** see, and who can report on them?          | Everything for themselves; only admins can report on them. The admin dashboard's "recruits without a manager" widget exists for this — keep it, it is one query                                                   |
| A4  | Are `RECRUIT`-role users the only ones with a `start_date`?                       | All users have one; it only drives onboarding metrics for recruits                                                                                                                                                |
| A5  | Is `entry_date` distinct from `created_at` and can they disagree?                 | Yes — `entry_date` is the diary date and may be backdated. Every filter, report and dashboard uses `entry_date`. State this once, loudly, in the README; it is the most likely source of "why is my report empty" |
| A6  | Should a recruit see _who_ resolved their issue?                                  | Yes — display `updated_by`. It is already modelled and makes the manager-write path visible in the demo                                                                                                           |
| A7  | Does soft-deleting a user hide their entries from reports?                        | No (A-19): deactivation only blocks login                                                                                                                                                                         |
| A8  | Time zone of "today" for future-date validation                                   | Server UTC (A-20). A recruit in UTC+13 may see a same-day rejection; accept and document                                                                                                                          |

### 5.3 Complexity traps

1. **Four parallel CRUD stacks written by hand.** ~2 400 lines of near-duplicate code and four chances to omit the owner filter. Solve with O5's factory.
2. **Dashboard as one endpoint returning eight metrics.** Written naively it becomes 8 sequential queries × N recruits. Write it as **one grouped aggregate query per entity type** (three queries total, grouped by `owner_id`), then assemble in memory. Decide this before writing the endpoint; retrofitting it is a rewrite.
3. **PDF generation drifting from the JSON report.** Two code paths producing "the same" report always diverge. Enforce: one `buildReport(request, actor) → ReportModel`, three renderers (JSON/PDF/CSV) that take `ReportModel` and add zero data access.
4. **Filter parsing duplicated per endpoint.** One `parseListQuery(schema)` helper returning `{ where, orderBy, skip, take }`, with the scope predicate injected by the repository, never by the caller.
5. **`If-Match`/`version` plumbing through every form.** Skip per D3, but keep the column.
6. **Enum drift between DB, API and UI labels.** Single source: one TS enum per type, generated Zod schema, Prisma enum, and a UI label map. No string literals in components.

---

## 6. Security requirements that MUST remain in the MVP

Non-negotiable. Each is cheap; each is the kind of thing whose absence invalidates the exercise.

| #   | Requirement                                                                                                                                      | Spec ref          | Note                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| S1  | Passwords hashed with bcrypt (cost ≥ 12) or argon2id — never plaintext, never reversible, never logged, never returned                           | SEC-01            | ~5 lines                                                                                                                  |
| S2  | Session token in an `HttpOnly`, `SameSite` cookie; **no tokens in `localStorage`**                                                               | SEC-03            | The simplification in O1 does not relax this                                                                              |
| S3  | Server-side authorisation on **every** request; UI hiding is never the control                                                                   | SEC-11            | The whole point                                                                                                           |
| S4  | Ownership/scope filters in the SQL `WHERE` clause on every access path — including exports                                                       | SEC-12            | Export paths are the classic bypass                                                                                       |
| S5  | Mass-assignment allow-lists: `role`, `owner_id`, `is_active`, `manager_id`, `version`, timestamps are never client-writable outside admin routes | SEC-13            | Strict body schemas (retained in O9)                                                                                      |
| S6  | Parameterised queries / ORM bindings only; no string-concatenated SQL                                                                            | SEC-06            | Free with Prisma; matters if raw SQL is used for the dashboard aggregates — use `Prisma.sql` templates, not interpolation |
| S7  | Output encoding by default; no `dangerouslySetInnerHTML` on user content                                                                         | SEC-07            | Free with React unless deliberately broken                                                                                |
| S8  | CSV formula-injection sanitisation (`=`, `+`, `-`, `@`, TAB, CR prefixed with `'`)                                                               | SEC-14            | ~6 lines, and one of the few genuinely non-obvious details in the spec — a reviewer noticing it is a strong positive      |
| S9  | Generic credentials error; no user enumeration on login                                                                                          | SEC-19, US-02 AC2 | One shared error path                                                                                                     |
| S10 | Deactivated accounts cannot authenticate, and `is_active` is re-checked per request                                                              | US-02 AC3, §10.4  | Replaces the deferred `token_epoch`                                                                                       |
| S11 | Secrets from environment variables only; `.env.example` committed, `.env` never                                                                  | SEC-15            |                                                                                                                           |
| S12 | Errors never leak stack traces, SQL or internal paths                                                                                            | SEC-22            | One global error handler                                                                                                  |
| S13 | Signup always forces role `RECRUIT`; a `role` field in the body is ignored or rejected                                                           | FR-A2             | A privilege-escalation one-liner if forgotten                                                                             |
| S14 | UUID primary keys (non-enumerable ids)                                                                                                           | SEC-12            | Free                                                                                                                      |

**Deferrable security** (state the deferral, do not silently drop): rate limiting/lockout (D13 — ship the stub), password-strength rules beyond a length minimum, CSP/HSTS headers (one middleware — actually cheap enough to keep), dependency scanning, refresh rotation.

---

## 7. Authorization rules that MUST remain exactly as specified

These are the graded requirements. Implement verbatim; do not "improve" them.

### 7.1 Predicates — unchanged

```
readable_user_ids(actor) :=
    ADMIN    -> all user ids
    MANAGER  -> {actor.id} ∪ {u.id : u.manager_id = actor.id AND u.deleted_at IS NULL}
    RECRUIT  -> {actor.id}
```

Applied **in SQL**, on every entry read path, including dashboard aggregates and report/export queries. One implementation. No endpoint may hand-roll a check.

### 7.2 Rules to preserve verbatim

| Rule                                                                                                                                                                             | Spec ref            | Why it cannot move                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| Notes are owner-only (managers excluded even in scope)                                                                                                                           | §6.3, AZ-M4         | It is the only rule that distinguishes "in scope" from "entitled" — the subtlety being tested |
| Managers may update **only** `status` and `resolution_notes`, **only** on in-scope issues, and a request containing any other field is rejected **whole**, with no partial write | AZ-M5               | Field-level authorisation + transactional rejection                                           |
| Managers may never create or delete another user's entries                                                                                                                       | AZ-M10, A-13        | Data-ownership integrity                                                                      |
| Out-of-scope `owner_id`/`user_ids` supplied explicitly → `403 OUT_OF_SCOPE`; direct resource id the caller cannot see → `404`                                                    | §11.7               | Consistency is the signal; inconsistency reads as accident                                    |
| Recruits are hard-filtered to self; any other `owner_id` → `403`; foreign entry id → `404`                                                                                       | AZ-R1, AZ-R2        | Core privacy requirement                                                                      |
| Recruits cannot PATCH `role`, `manager_id`, `is_active`, `email` on themselves → `403 FORBIDDEN_FIELD`, whole request rejected                                                   | AZ-R5               | Privilege escalation                                                                          |
| Report scope: recruit `SELF` only; manager in-scope only; **no silent narrowing** — out-of-scope target fails the whole request                                                  | AZ-M6, AZ-M7, §17.3 | Reports are the highest-volume data-egress path                                               |
| Manager scope is evaluated **live**; reassignment takes effect on the next request with no caching                                                                               | AZ-M8               | Prevents a stale-scope data leak                                                              |
| Managers never receive other users' email addresses                                                                                                                              | SEC-18, AZ-M9       | Keep; implement via separate DTOs (C7)                                                        |
| Admin cross-user entry writes are always audited                                                                                                                                 | §11.6               | The one audit event that must survive the O2 cut                                              |

### 7.3 The authorisation test suite is MVP, not Phase 2

A single `authz-matrix.spec.ts` covering AZ-M1…M10 and AZ-R1…R6 against a seeded two-manager fixture. Roughly 16 tests, ~250 lines, and it is the highest-value artefact in the repository after the authorisation module itself. **Write it in Milestone 3, before the entry features exist** — the tests will fail until the endpoints land, which is the correct order.

---

## 8. Database design concerns

| #    | Concern                                                                         | Assessment                                                                                                                                                                                                                                                                          | Action                                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DB1  | Biconditional CHECKs (`task_done_ts`, `issue_resolved_ts`)                      | **Real defect** — see C1/C2                                                                                                                                                                                                                                                         | Relax to one-way implications                                                                                                                                                                                      |
| DB2  | Four structurally similar entry tables vs. one polymorphic table                | Four tables is **correct**. A single `entries` table with a `type` discriminator and nullable type-specific columns would abandon NOT NULL constraints and enums — the exact rigour being demonstrated. The duplication belongs in the schema; the DRY belongs in the service layer | Keep four tables                                                                                                                                                                                                   |
| DB3  | `tags text[]` vs. a `note_tags` child table                                     | Array + GIN is right for ≤ 10 tags with no tag metadata. A child table adds a join and a migration for no benefit                                                                                                                                                                   | Keep the array                                                                                                                                                                                                     |
| DB4  | Partial unique index on email (`WHERE deleted_at IS NULL`)                      | Correct, and subtle — it permits re-registering a deleted user's email. Since users are only ever deactivated (A-19), never soft-deleted in practice, this is latent complexity                                                                                                     | Drop `users.deleted_at` for MVP; `is_active` is the whole lifecycle. Plain unique index on email                                                                                                                   |
| DB5  | `created_by`/`updated_by` NOT NULL FKs on all four entry tables                 | 8 extra FKs. But `updated_by` is what makes the manager-resolves-issue demo legible ("Updated by Marcus Bell")                                                                                                                                                                      | Keep `updated_by`; drop `created_by` (it equals `owner_id` except for admin backfill, which is deferred)                                                                                                           |
| DB6  | `ON DELETE RESTRICT` everywhere                                                 | Correct given soft deletes. Ensure the seed/reset script deletes in dependency order or truncates with `CASCADE`                                                                                                                                                                    | Document a `db:reset` script                                                                                                                                                                                       |
| DB7  | Index count (~18 indexes on 6 tables)                                           | Over-indexed for the data volume. Each index is a write cost and a review surface                                                                                                                                                                                                   | Keep: `owner_id, entry_date DESC` partial per entry table; `owner_id, status` on tasks and issues; `users.manager_id`; `users.email` unique. Drop trigram and most secondary enum indexes until a query needs them |
| DB8  | `audit_logs.before/after jsonb` with redaction rules                            | The redaction rule ("never full note bodies") is a real leak vector — the audit table would otherwise become a copy of private notes readable by anyone with DB access                                                                                                              | **Keep the rule.** With the O2 cut, store changed-field names + old/new values only for user/role/manager changes                                                                                                  |
| DB9  | No unique constraint preventing duplicate entries                               | Deliberate — a recruit may legitimately log two tasks with the same title on the same day                                                                                                                                                                                           | Correct as-is; no action                                                                                                                                                                                           |
| DB10 | Manager acyclicity and manager-role validity enforced only in the service layer | Correct (not expressible in a CHECK). With one-level scope (A-18), a cycle cannot cause infinite recursion — only nonsense data                                                                                                                                                     | Validate role + self-reference on write; skip the cycle walk for MVP                                                                                                                                               |
| DB11 | `report_runs.target_user_ids uuid[]` denormalised                               | Fine for an audit record                                                                                                                                                                                                                                                            | Keep if D12 is kept, else drop the table                                                                                                                                                                           |
| DB12 | Migrations forward-only, checked in, plus a seed script                         | Essential; the single most common gap in interview submissions                                                                                                                                                                                                                      | Non-negotiable — Milestone 1                                                                                                                                                                                       |
| DB13 | Soft-deleted rows in every query                                                | Every query needs `deleted_at IS NULL`, and forgetting it in one place is a data leak of "deleted" content                                                                                                                                                                          | Enforce in the scoped repository, never at the call site. Consider Prisma middleware/extension so it cannot be forgotten                                                                                           |

**Net:** the schema is sound. The changes are: relax two CHECKs, drop `users.deleted_at` and `created_by`, halve the indexes, defer `report_runs`.

---

## 9. API design concerns

| #     | Concern                                                                                           | Assessment                                                                                                                                                     | Action                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API1  | Uniform `/api/v1/{type}` shape across four entry types                                            | Excellent — one client abstraction, one server factory                                                                                                         | Keep                                                                                                                                                                                                                                |
| API2  | `PATCH` with strict schemas                                                                       | Correct; `PUT` would invite mass assignment                                                                                                                    | Keep                                                                                                                                                                                                                                |
| API3  | `preview` vs `export` split                                                                       | Duplicated data path                                                                                                                                           | Merge (O4)                                                                                                                                                                                                                          |
| API4  | `PATCH /issues/{id}` **and** `PATCH /issues/{id}/status`                                          | Two write paths into one resource with different authorisation rules is a genuine hazard: a reviewer will ask which one enforces the manager field restriction | Keep **only** `PATCH /issues/{id}` and enforce the field allow-list by role inside it. One path, one rule. (Alternative — status-only sub-resource as the _sole_ manager write path — is also defensible; pick one and document it) |
| API5  | `403` vs `404` policy                                                                             | Correct and well-reasoned                                                                                                                                      | Implement verbatim; add a comment in the authz module explaining it — reviewers notice deliberate choices                                                                                                                           |
| API6  | Envelope `{data, pagination, meta}` on lists but `{data}` on singletons and `{error}` on failures | Consistent enough; `meta.filters_applied` is redundant with the request                                                                                        | Keep the envelope, drop `meta.filters_applied`                                                                                                                                                                                      |
| API7  | Multi-value filters as comma-separated strings                                                    | Fine, but needs one parser with explicit enum validation, or it becomes an injection-shaped hole in a raw-SQL dashboard query                                  | One `parseEnumList(enum, value)` helper; reject unknown values with `422`                                                                                                                                                           |
| API8  | `owner_id` as a query filter doubling as an authorisation assertion                               | This is the crux: `?owner_id=X` must be validated against `readable_user_ids` **before** it reaches the repository, otherwise the filter silently widens scope | Validate in one middleware/service guard, not per endpoint                                                                                                                                                                          |
| API9  | No endpoint returns another user's email except admin routes                                      | Requires disciplined DTOs (C7)                                                                                                                                 | Two serialisers, explicit                                                                                                                                                                                                           |
| API10 | Cookie auth + JSON API                                                                            | Needs either CSRF tokens or `SameSite` + JSON-content-type enforcement                                                                                         | Choose `SameSite=Lax` + reject non-JSON content types on mutations; document the decision                                                                                                                                           |
| API11 | `/health` and `/ready`                                                                            | Cheap, shows operational awareness                                                                                                                             | Keep                                                                                                                                                                                                                                |
| API12 | No API documentation artefact specified                                                           | For an interview, a generated OpenAPI/Swagger page is disproportionate value for the effort (zod-to-openapi is ~30 lines)                                      | Add in Phase 2                                                                                                                                                                                                                      |
| API13 | Versioning at `/api/v1`                                                                           | Free, sensible                                                                                                                                                 | Keep                                                                                                                                                                                                                                |
| API14 | Export endpoints return binaries from a `POST`                                                    | Correct (the request body is large), but breaks "download by clicking a link"                                                                                  | Front end fetches the blob and triggers a client-side download; note it in the README                                                                                                                                               |

---

## 10. Performance and scalability that can be deferred

| Deferred                                                            | Spec ref     | Rationale                                                                                                       |
| ------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| P95 latency targets, 100-concurrent-user and 100k-entry benchmarks  | NFR-01/02/03 | Unverifiable in an interview build; a stated-but-untested NFR is a liability                                    |
| Multi-replica statelessness, load-balancer readiness                | NFR-05       | One container is the deployment. Statelessness comes free from cookie sessions — mention it, don't build for it |
| Connection-pool tuning, statement timeouts, separate report DB role | §21.5        | Defaults are fine at this scale                                                                                 |
| Streaming CSV                                                       | §17.5        | With a 10 000-row cap, buffering is fine. **Keep the cap** — it is what makes buffering safe                    |
| Async report jobs                                                   | §17.5        | O3                                                                                                              |
| Trigram search indexes                                              | §21.4        | With D9                                                                                                         |
| Client-side 60 s dashboard cache                                    | §16.1        | TanStack Query's defaults already do this                                                                       |
| Retention/purge jobs, nightly backups, RPO/RTO                      | §21.5        | Deployment concerns; document, don't build                                                                      |
| Cursor pagination                                                   | §23.1        | Page-based is correct at this scale                                                                             |

**Two performance rules that must NOT be deferred**, because retrofitting them is a rewrite rather than a tune:

1. **No N+1 in the manager/admin dashboard** — grouped aggregate queries only (§16.4).
2. **Every list query is index-backed on the `owner_id`-leading index** — which is also the authorisation predicate, so the fast path and the safe path are the same path.

---

## 11. Scope categorisation

### 11.1 MUST HAVE — MVP

_Definition of done: a reviewer can `docker compose up`, log in as three roles, exercise the full diary, see a dashboard, generate and download a PDF and a CSV, and read a green authorisation test suite._

**Authentication & accounts**

1. Sign up (always `RECRUIT`), log in, log out; bcrypt/argon2 hashing; `HttpOnly`+`SameSite` session cookie; `GET /auth/me`.
2. Profile: view/edit own name, department, start date. Role/manager/active are not self-editable.
3. Admin user management: list users, change role, assign manager, activate/deactivate. (Create-user optional — signup + admin edit covers it.)
4. Departments seeded and readable; no CRUD screen.

**Authorization** 5. `readable_user_ids(actor)` in one module, applied in SQL on every read path including dashboards and exports. 6. `assert_can_write(actor, entry, fields)` covering owner / admin / manager-issue-fields. 7. The 403/404 disclosure policy, implemented consistently. 8. Every rule listed in §7.2 above, verbatim.

**Entries** 9. Task CRUD + soft delete; filters date/date-range, category, status; pagination; sorting. 10. Issue CRUD + soft delete; filters status, severity; resolution workflow with `resolution_notes` required on RESOLVED/CLOSED; manager may update those two fields on in-scope issues. 11. Feedback CRUD (date, subject, type, details). 12. Note CRUD (date, title, content, tags) — owner + admin only. 13. Shared validation via one schema per type, enforced server-side, mirrored by DB constraints.

**Dashboard** 14. Recruit: summary counts, task completion %, open issues, recent entries. 15. Manager: roster of in-scope recruits with completion % and open-issue counts + aggregate cards. 16. Admin: org totals + per-department breakdown. (May reuse the manager component with a wider scope.)

**Reports & export** 17. `POST /api/v1/reports` — date range, section selection (tasks/issues/feedback, notes for admin), scope authorised per §17.3 with no silent narrowing, `format: JSON|PDF|CSV`. 18. PDF: header (scope, range, generated by/at), summary table, detail tables, page numbers. 19. CSV: RFC 4180, UTF-8 BOM, formula-injection sanitised, combined = single file with `record_type`. 20. Manager may report only on in-scope recruits; recruit only on self; admin on anyone.

**Platform** 21. PostgreSQL, Prisma schema + checked-in migrations + seed (2 managers × 3 recruits, 1 unassigned recruit, 1 admin, ~120 entries across 60 days). 22. Responsive UI 320 px → desktop; tables collapse to cards; filter drawer on mobile. 23. Loading / empty / error states on every data surface (the shared components, not bespoke per screen). 24. Global error envelope + error handler; friendly 403/404/500 screens. 25. **Authorisation test suite** (AZ-M1…M10, AZ-R1…R6) + a smoke E2E for one golden path per role. 26. Security items S1–S14 (§6). 27. `docker compose up` with seed; README with demo credentials, architecture notes, the assumptions register and the deferral list.

### 11.2 SHOULD HAVE — Phase 2

_Adds credibility and operational realism once the core works._

28. Audit logging: the 6 retained actions (O2), written in the same transaction as the mutation, plus the admin audit viewer.
29. Refresh-token rotation with revocation; short access-token TTL; `token_epoch` invalidation on role/active change.
30. Rate limiting + lockout on `/auth/login` (real, not stubbed) with `Retry-After`.
31. Admin: create user with a one-time temporary password + forced password change; department CRUD.
32. Optimistic concurrency: `If-Match` + `409 STALE_WRITE` + a reload/overwrite UI affordance.
33. `ReportRun` persistence, `/reports/history`, and DENIED-attempt records.
34. Report extras: `group_by`, per-section filters, "since start date", per-user summary metrics (avg issue resolution days).
35. Dashboard extras: `activity_by_day` heatmap, `streak_days`, `needs_attention` panel, status/severity charts.
36. Full text search (`q`) across title/description with a trigram index.
37. Unified `/history` timeline; saved filter views.
38. OpenAPI document generated from the Zod schemas + a Swagger page.
39. CSP/HSTS/security headers middleware; `npm audit` in CI.
40. Accessibility pass: keyboard traversal, focus management in dialogs, `aria-live` for async results, contrast audit.
41. Wider test coverage: service-layer unit tests, validation edge cases, PDF/CSV snapshot tests, E2E per role.
42. Structured logging (`pino`) with `request_id` propagation; `/health` + `/ready`.

### 11.3 NICE TO HAVE — Phase 3

43. Onboarding checklist templates auto-instantiated per department on start date.
44. Comments/threads on issues (replacing overwritten `resolution_notes`).
45. Mood/confidence rating per day with a trend chart.
46. 30/60/90-day milestone view; manager 1:1 prep view.
47. Weekly digest email to managers; `Mailer` port with a console adapter.
48. Async report jobs (`202` + polling) and scheduled recurring reports.
49. Attachments on entries via S3-compatible storage with signed URLs.
50. Bulk CSV import of tasks; bulk delete.
51. Department-level analytics; feedback sentiment split.
52. Recycle bin with 30-day self-service restore.
53. SSO/OIDC, SCIM provisioning, API tokens.
54. Multi-manager (join table), transitive org-hierarchy scope.
55. Public expiring read-only report links.
56. Real-time notifications (Slack/Teams, in-app).

---

## 12. Recommended technology stack (final)

Unchanged in substance from spec §28 — it was the right call — with the following **pinned decisions** so the implementer has no choices left to make.

| Layer         | Decision                                                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Language      | TypeScript 5, strict mode, `noUncheckedIndexedAccess`                                                                                                                                                                                                                          |
| Framework     | **Next.js 15 App Router** — one process, one deployment, one language, server components for list pages, route handlers for the REST API                                                                                                                                       |
| API           | REST at `/api/v1/*` via route handlers; thin handlers: parse → authorise → service → serialise                                                                                                                                                                                 |
| Validation    | **Zod**, one schema module shared by route handlers and React Hook Form                                                                                                                                                                                                        |
| ORM           | **Prisma 5** + checked-in migrations + `seed.ts`                                                                                                                                                                                                                               |
| DB            | **PostgreSQL 16** in Docker                                                                                                                                                                                                                                                    |
| Auth          | Hand-rolled: `bcrypt` + signed JWT in an `HttpOnly; SameSite=Lax; Secure` cookie, 8 h TTL, verified in middleware, `is_active`/`role` re-read per request. _Not_ Auth.js — its abstractions cost more than they save here and obscure the authorisation story you want visible |
| UI            | React 19 + Tailwind + **shadcn/ui** (Radix)                                                                                                                                                                                                                                    |
| Data fetching | **TanStack Query 5**                                                                                                                                                                                                                                                           |
| Forms         | React Hook Form + `zodResolver`                                                                                                                                                                                                                                                |
| PDF           | **@react-pdf/renderer** (no headless Chromium in the image)                                                                                                                                                                                                                    |
| CSV           | Hand-rolled ~40-line writer with the injection sanitiser, or `fast-csv`                                                                                                                                                                                                        |
| Charts        | Recharts (Phase 2 only)                                                                                                                                                                                                                                                        |
| Tests         | **Vitest** (unit + API integration against a real Postgres), **Playwright** (smoke E2E)                                                                                                                                                                                        |
| Quality       | ESLint, Prettier, `tsc --noEmit`, Husky pre-commit                                                                                                                                                                                                                             |
| CI            | GitHub Actions: lint → typecheck → test (Postgres service container) → build                                                                                                                                                                                                   |
| Runtime       | `docker compose up` → app + postgres, migrations + seed on start                                                                                                                                                                                                               |

**Why this remains right for the exercise:** one language and one shared validation source removes client/server drift; Prisma+Postgres gives real constraints, enums and migrations that make the DB design reviewable; the modular monolith keeps the authorisation choke point readable in a single file — which is precisely what the reviewer is looking for. No microservices, no queue, no cache, no object storage, no separate API gateway: every one of those would add operational surface without adding a single point of assessable signal.

### 12.1 Project structure (modular monolith)

```
/app
  /(public)/login, /signup
  /(app)/dashboard, /tasks, /issues, /feedback, /notes, /team, /team/[userId],
         /reports, /profile
  /(admin)/admin/users
  /api/v1
    /auth/[...]                 # signup, login, logout, me
    /users, /users/[id], /users/me
    /departments
    /tasks, /issues, /feedback, /notes        # generated from one factory
    /reports
    /health
  /403, /404, /error
/src
  /modules                      # <- the modular monolith boundary
    /auth        { service, password, session, cookies }
    /authz       { scope.ts (readable_user_ids), policy.ts (assert_can_write), errors.ts }
    /users       { service, repository, dto (UserSummary | UserAdmin) }
    /entries     { factory.ts, base-repository.ts, tasks/, issues/, feedback/, notes/ }
    /dashboard   { service (3 grouped aggregate queries) }
    /reports     { build-report.ts, renderers/{json,pdf,csv}.ts }
    /audit       { service }                   # Phase 2
  /shared
    /schemas     # Zod, shared client+server
    /http        # envelope, error handler, parseListQuery, pagination
    /db          # prisma client + soft-delete/scope extension
    /ui          # states/{Loading,Empty,Error}, tables, forms, layout
/prisma           schema.prisma, migrations/, seed.ts
/tests            authz-matrix.spec.ts, api/, e2e/
docker-compose.yml, Dockerfile, .env.example, README.md
```

**Module rules (enforce with an ESLint boundary rule if time permits):**

- Route handlers never import Prisma directly — only module services.
- All entry data access goes through `entries/base-repository.ts`, which injects `readable_user_ids` and `deleted_at IS NULL`. There is no other way to query an entry table.
- `authz` depends on nothing but types; everything depends on `authz`.
- `reports/renderers/*` receive a `ReportModel` and perform zero data access.

---

## 13. Proposed implementation sequence

Ten milestones. Each ends in something demonstrable; each is a coherent commit/PR. Sizes are my own throughput, not human-team estimates.

| #       | Milestone                                     | Deliverable                                                                                                                                                                                                                                                                                                                 | Demo at the end                                                                                                                                                                                                        | Rough size |
| ------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **M1**  | **Skeleton + database**                       | Next.js + TS + Tailwind + shadcn scaffold; docker-compose (app + Postgres); Prisma schema for departments, users, 4 entry tables (with the C1/C2 relaxed CHECKs, DB4/DB5 simplifications, trimmed indexes); migration 1; seed script (admin, 2 managers, 6 recruits, 1 unassigned, ~120 entries); CI running lint+typecheck | `docker compose up` → app boots, `/health` green, seeded data visible in Adminer/psql                                                                                                                                  | S          |
| **M2**  | **Auth**                                      | Signup (forced `RECRUIT`), login, logout, `/auth/me`; bcrypt; session cookie; middleware; login/signup screens; app shell with role-aware nav; protected routes                                                                                                                                                             | Log in as each of the three seeded roles; nav differs by role; logout works                                                                                                                                            | M          |
| **M3**  | **Authorization core + its tests**            | `authz/scope.ts`, `authz/policy.ts`, error types, 403/404 policy, global error envelope and handler; `authz-matrix.spec.ts` written **now** (red)                                                                                                                                                                           | Run the test suite: the authz spec compiles and fails for the right reasons; explain the module in 5 minutes                                                                                                           | M          |
| **M4**  | **First vertical slice — Tasks**              | Entry factory + scoped base repository; Task API (list/create/detail/patch/soft-delete) with filters, pagination, sorting; task list UI (responsive table→cards), filter bar, create/edit modal; loading/empty/error states                                                                                                 | Recruit logs, edits, filters and deletes tasks on desktop **and** at 320 px; a manager sees an in-scope recruit's tasks and gets 403/404 out of scope. **This is the first genuinely impressive demo**                 | L          |
| **M5**  | **Issues (incl. the manager write path)**     | Issue API via the factory; status transitions; `resolution_notes` rule; field-level manager permission; issue UI + resolution panel showing `updated_by`                                                                                                                                                                    | Recruit raises a HIGH blocker → manager resolves it with notes → recruit sees "Resolved — updated by Marcus Bell"; manager attempting to edit the title is rejected. First green rows in the authz matrix for M5 rules | M          |
| **M6**  | **Feedback + Notes**                          | Both via the same factory; notes owner-only rule (404 for managers) + tags; feedback types                                                                                                                                                                                                                                  | All four entry types working; a manager provably cannot reach a recruit's notes. **Authz matrix now fully green**                                                                                                      | S          |
| **M7**  | **Dashboards**                                | Three grouped aggregate queries; recruit dashboard (counts, completion %, open issues, recent entries); manager roster; admin org view                                                                                                                                                                                      | Each role logs in and lands on a meaningful dashboard; manager roster shows exactly their 3 recruits                                                                                                                   | M          |
| **M8**  | **Reports — JSON + CSV**                      | `buildReport()` + scope authorisation (no silent narrowing) + row caps; report builder UI with range presets, scope picker (role-limited), section checkboxes; on-screen preview; CSV renderer with the injection sanitiser                                                                                                 | Manager builds a team report for last 30 days, previews it, downloads a CSV that opens cleanly in Excel; out-of-scope selection is impossible in the UI and rejected by the API                                        | M          |
| **M9**  | **Reports — PDF + export polish**             | `@react-pdf/renderer` renderer sharing the same `ReportModel`; header/summary/detail/footer; filenames and download headers                                                                                                                                                                                                 | Same report downloaded as a presentable PDF; PDF and CSV provably contain identical rows                                                                                                                               | M          |
| **M10** | **Admin, responsive polish, hardening, docs** | Admin users screen (role, manager, activate/deactivate) with last-admin protection; responsive/a11y pass across all screens; security checklist S1–S14 verified; smoke E2E per role; README (architecture, authz model, assumptions, deferrals, demo credentials)                                                           | Full end-to-end walkthrough: admin reassigns a recruit → the old manager immediately loses access, the new one gains it (AZ-M8, live)                                                                                  | M          |

**Then, only if time remains:** M11 = audit logging + viewer (Phase 2 #28), M12 = rate limiting, refresh rotation, OpenAPI (Phase 2 #29, #30, #38).

### 13.1 Sequencing principles behind this order

1. **Authorisation before features (M3 before M4).** Writing the matrix spec against a non-existent API forces the API shape to be authorisation-first rather than authorisation-patched.
2. **One vertical slice before breadth (M4 before M5/M6).** M4 proves the factory abstraction; M5–M6 then cost a fraction of M4. If the abstraction is wrong, you learn it once, not four times.
3. **Dashboards after entries (M7).** They aggregate data that must exist first, and the seed alone is not a substitute for data created through the UI.
4. **CSV before PDF (M8 before M9).** CSV validates `buildReport()` cheaply; PDF is presentation over an already-proven model. If the schedule slips, you ship one working export rather than two half-working ones.
5. **Admin last (M10).** It is the least-used role in a demo and the most CRUD-shaped work; it is the correct thing to compress if time runs short.

### 13.2 Cut lines if time runs short

Cut in this order, and record each cut in the README:

1. Admin UI beyond role/manager assignment (keep the API).
2. Admin dashboard (reuse the manager view with a wider scope).
3. PDF charts, print stylesheet, dashboard heatmap.
4. Notes tags filtering (keep tags stored and displayed).
5. Feedback list filtering by type.

**Never cut:** the authorisation module, the authz test suite, the seed with interleaved managers, PDF _or_ CSV export, or responsive behaviour. Those four are the assessment.

---

## 14. Review conclusion

**Approved to implement, subject to:**

1. Applying the ten contradiction resolutions in §5.1 (C1–C10) — chiefly the two biconditional CHECK constraints, the duplicated completion-percentage formula, and the merged report endpoint.
2. Adopting the simplifications in §4 (O1–O13), each with its trade-off recorded in the README rather than silently dropped.
3. Treating §6 (S1–S14) and §7 (the authorisation rules) as frozen — no simplification below that line.
4. Building in the M1–M10 order, with the authorisation test suite written at M3.

The spec's greatest strength is that it makes authorisation an architectural component rather than a set of scattered `if` statements. The greatest schedule risk is that its thoroughness invites building depth-first. Build the M4 slice end-to-end first; everything after it is repetition of a proven pattern.
