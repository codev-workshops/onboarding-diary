# Assumptions & Decisions

This document records every decision that is **not** explicitly specified in
[`MANDATE.md`](./MANDATE.md). Each item includes a rationale and a status:

- **confirmed** — settled for the purpose of this exercise.
- **pending confirmation** — needs product-owner sign-off before implementation
  begins.

> **✅ Product-owner sign-off received.** All previously-open items have been
> confirmed and implementation can begin:
>
> - Storage engine default / first-boot behavior — **confirmed** (§2)
> - Tech stack — **confirmed** as React + REST (§3, details in `techstack.md`)
> - Enum value sets — **confirmed** two-tier model, seeded defaults, and
>   soft-disable for in-use task categories (§4)
> - Manager→Recruit oversight — **confirmed** as Admin-assigned with department
>   membership (§5)
> - Auth mechanism & password policy — **confirmed** as JWT + upgradeable
>   `PasswordPolicy` (min 8 chars in v1) (§1)
>
> **✅ Planning-phase items — now confirmed:**
>
> - Demo seed data & demo accounts on first boot — multiple departments, managers,
>   and recruits (§9)
> - User provisioning model — Admin-created, no open self-registration (§10)
> - Reports — render on screen first, then export to PDF/CSV (§11)
> - Mode derived from a single `DB_STRING` variable (no `DEMO_MODE`) driving
>   datasource + onboarding enablers (§13), with an explicit demo→production
>   cutover via a standalone setup tool (§23)

---

## 1. Authentication model

**Status:** confirmed

- **Role model:** Multi-user with three roles — **Recruit**, **Manager**,
  **Admin** — per the MANDATE.
- **Auth mechanism:** **JWT** (JSON Web Tokens). The API is a stateless REST
  backend, so bearer tokens fit the architecture. Passwords are stored using a
  modern adaptive hash (bcrypt algorithm, via the `bcryptjs` library).
- **Password policy:** Enforced through a dedicated, **upgradeable** policy
  component — class **`PasswordPolicy`** (with a `validate(password)` method) —
  so the rules can be strengthened later without touching call sites.
  - **Current policy (v1):** minimum **8 characters**. No other constraints for
    now.

**Rationale:** The MANDATE specifies email/password auth and three roles but not
the session/JWT choice or password policy. Isolating the rules in
`PasswordPolicy` keeps the policy a single, swappable source of truth.

## 2. Storage & first-boot behavior

**Status:** confirmed

- On **first boot**, the application starts with an **in-memory (or SQLite)**
  database and **active onboarding enablers** — tooltips / coach marks /
  welcome mats delivered via an onboarding UI library — to guide the very first
  users.
- Once an **admin configures a production database** (e.g., PostgreSQL) and data
  is populated, the **onboarding enablers are disabled** automatically.

The precise datasource/enabler behavior is governed by a **demo-mode feature
flag** — see §13.

**Rationale:** This first-boot experience is a **product-owner addition** and is
**not** in the MANDATE, which only requires generic "database persistence".

## 3. Tech stack

**Status:** confirmed (React + REST)

The MANDATE delegates the stack to the candidate ("tech stack is candidate's
choice"). Confirmed at a high level: **React** frontend with a **REST** backend.
The concrete selections (build tooling, backend framework, ORM, testing, and
PDF/CSV libraries) are recorded in **[`techstack.md`](./techstack.md)**.

**Rationale:** Concrete choices affect implementation; the authoritative,
detailed list lives in `techstack.md` to keep this document focused on decisions
rather than dependency inventory.

## 4. Enum / value-set management (two-tier)

**Status:** confirmed

Rather than treating every categorical field as a single "define the enum values"
decision, value sets are split into **two tiers** based on whether the app's
features depend on the _semantic meaning_ of each value.

### Tier 1 — Admin-configurable

- **Task `category`** is managed by the Admin, who can **add, rename, and delete**
  categories at runtime.
- Deleting a category still referenced by existing task entries must be a
  **soft-disable / archive** (mark inactive so it no longer appears when creating
  or filtering new tasks) rather than a **hard delete**, to avoid orphaning
  existing task entries.
- Category is safe to make free-form/admin-editable because no feature relies on
  the specific _meaning_ of any given category — it is used only for grouping and
  filtering.

### Tier 2 — Seeded defaults (system-defined in v1, not free-form editable)

The following are **seeded** on first boot and are **system-defined** in v1; they
are **not** free-form editable by the Admin:

- Task `status`
- Task `priority`
- Issue `severity`
- Issue `status`

**Rationale:** the Dashboard and Reports depend on the _semantic meaning_ of these
values, not just their labels. For example:

- "Task completion progress" needs to know _which_ status means **done**.
- "Open issues at a glance" needs to know _which_ issue statuses count as **open**
  vs. resolved.
- Priority and severity carry an inherent **ordering** (Low < Medium < High < …)
  that Reports and sorting rely on.

If these were free-form editable, an Admin could rename or remove the value the
analytics logic keys off of and silently break the Dashboard and Reports.

**Future direction:** if these become configurable in a later version, they must
be exposed as a **managed list** where each entry carries a **protected semantic
flag** (e.g. `isTerminal` / `isOpen`, priority `rank`) rather than free text, so
the semantic contract the Dashboard and Reports depend on is preserved regardless
of display label.

### Fixed by mandate

- Feedback `type` is **hardcoded** to **Positive / Suggestion / Concern** and is
  **not** editable (Admin or otherwise). This is fixed by the MANDATE.

### Default value sets to seed on first boot

Seeded on first boot so a **zero-config** install demonstrates every feature
immediately (a fresh install has a working, populated set of
statuses/priorities/severities without any manual setup):

| Field            | Default values              |
| ---------------- | --------------------------- |
| Task `status`    | To Do, In Progress, Done    |
| Task `priority`  | Low, Medium, High           |
| Issue `severity` | Low, Medium, High, Critical |
| Issue `status`   | Open, In Progress, Resolved |

(Feedback `type` — Positive / Suggestion / Concern — is fixed by the MANDATE and
is not a seeded/configurable list.)

**Confirmed decisions:**

- The default value sets listed above (task status, task priority, issue severity,
  issue status) are the v1 seeded defaults.
- Deleting an in-use task `category` is a **soft-disable / archive** (not a hard
  delete).

**Rationale:** The MANDATE names these fields but does not enumerate their allowed
values or say which are admin-managed vs. system-defined; filtering, the
Dashboard, and Reports depend on a stable, well-defined set.

## 5. Manager → Recruit oversight

**Status:** confirmed

- An **Admin explicitly assigns** recruits to managers; this assignment is the
  oversight relationship used for manager reports and access control.
- Both **managers and recruits are members of a department**. Department is a
  membership attribute of users, _not_ the mechanism that drives oversight.
- Oversight is deliberately **not** department-derived: a department could have
  zero or multiple managers, which would make department-based oversight
  ambiguous. Explicit Admin assignment keeps the relationship unambiguous and
  easy to manage as users and departments change.

**Rationale:** The MANDATE says managers report on recruits they oversee but does
not define how that relationship is established; explicit assignment avoids the
multi-manager-per-department ambiguity.

## 6. Full CRUD for all entry types

**Status:** confirmed

- The MANDATE explicitly states CRUD only for **Tasks**. We assume **edit and
  delete are supported for all entry types** — Issues, Feedback Notes, and
  Additional Notes — in addition to create/read.

**Rationale:** Consistency across entry types is expected by users; there is no
indication other logs should be append-only.

## 7. Access-control rules

**Status:** confirmed

- **Recruit** sees only **their own** entries.
- **Manager** sees entries of the **recruits they oversee**.
- **Admin** sees **all** data.

**Rationale:** Standard least-privilege model consistent with the three-role
structure and the manager oversight feature.

## 8. Entry `date` semantics

**Status:** confirmed

- The entry **`date` is a user-entered field**. Therefore **no separate
  immutable `createdAt` rule** is required for entries.

**Rationale:** Users record the date an event occurred, which may differ from when
the record was created; the MANDATE treats `date` as a first-class user field.

---

# Decisions surfaced during planning

The following were not part of the original MANDATE or the initial assumptions;
they arose while planning the implementation and are documented here **before any
code is written**, per the product owner's requirement.

## 9. First-boot demo data & demo accounts

**Status:** confirmed

The principal implementation concern is **usability**: a default installation must
let a user understand **all** features immediately. To achieve this, first boot
seeds a **demonstration dataset** on the zero-config (SQLite/in-memory) database:

- **Multiple departments** — several departments so department creation and
  management is visibly demonstrated.
- **Multiple accounts across roles** — **multiple Managers** and **multiple
  Recruits** (spread across departments, with recruits assigned to different
  managers) plus at least one Admin. This showcases user and department creation/
  management and gives realistic data for both unit and e2e testing. Demo
  credentials are shown on the login screen / in the README for the demo
  environment only.
- **Demo entries** — a realistic spread of Tasks, Issues, Feedback Notes, and
  Additional Notes across a date range and across multiple recruits, with varied
  categories/statuses/priorities/severities so the **Dashboard** (summary counts,
  recent entries, completion progress, open issues) and **Reports** are populated
  and meaningful out of the box, and so manager-oversight views have real data.
- Demo data and demo accounts are present only in demo mode and are **not** seeded
  once running against a production database (see §13).

**Rationale:** "Default installation should allow users to understand all
features," including user/department management. Multiple managers, recruits, and
departments make oversight, access control, and management features observable on
first launch and provide meaningful fixtures for unit and e2e tests.

## 10. User provisioning

**Status:** confirmed

- **Admins create and manage user accounts** (recruits and managers), set their
  role, department, profile fields, and manager assignment.
- There is **no open/public self-registration** — the app is an internal
  onboarding tool, so accounts are provisioned by an Admin.

**Rationale:** The MANDATE specifies authentication and an Admin role but does not
describe how accounts are created. Admin provisioning fits an internal tool and is
consistent with the access-control model (§7) and oversight assignment (§5).

## 11. Reports scope & format

**Status:** confirmed

- **On-screen first, then export.** A report is **rendered on screen** (an
  interactive report view) from the selected filters; the user then **exports the
  displayed report** to **PDF** or **CSV**. The export reflects exactly what is
  shown on screen.
- **Date range** filters entries by their user-entered `date` (§8).
- A report covers **all four entry types** (Tasks, Issues, Feedback, Notes) within
  the range, plus summary metrics mirroring the Dashboard.
- **Scope by role** follows access control (§7): a Recruit reports on their own
  data; a **Manager** reports on the recruits they oversee (selectable per recruit
  or aggregated); an Admin can report on anyone.

**Rationale:** Rendering on screen first lets users preview/tune a report before
exporting, keeps PDF/CSV consistent with the view, and makes the report logic
directly testable (assert the on-screen report, then that exports match) in both
unit and e2e tests.

## 12. Audit timestamps vs. entry `date`

**Status:** confirmed

- In addition to the user-entered `date` (§8), every record carries
  system-managed **`createdAt`** and **`updatedAt`** audit timestamps used for
  ordering (e.g. "recent entries") and diagnostics.
- These are **distinct** from the entry `date` and are **not** user-editable; §8's
  point stands (no immutable `createdAt` rule is needed _for the entry date_).

**Rationale:** Standard persistence practice; needed for "recent entries" ordering
without conflating with the user-entered event date.

## 13. Mode is derived from a single variable, `DB_STRING`

**Status:** confirmed

There is **no `DEMO_MODE` flag**. The mode is derived from the presence of one
operator-facing environment variable, **`DB_STRING`** (the production PostgreSQL
connection string):

| `DB_STRING` | Mode           | Datasource             | Onboarding enablers | Demo accounts |
| ----------- | -------------- | ---------------------- | ------------------- | ------------- |
| **absent**  | **demo**       | SQLite (`DATABASE_URL`)| **on**              | seeded        |
| **present** | **production** | PostgreSQL             | off                 | never         |

- `demoMode = !DB_STRING`. Presence of `DB_STRING` **always** means production;
  there is no fallback from a configured production DB back to demo.
- **Demo mode** (no `DB_STRING`) runs on SQLite/in-memory, seeds the `@demo.local`
  demo accounts and sample data, and enables onboarding enablers (tour, demo
  credentials helper). It never connects to PostgreSQL.
- **Production mode** (`DB_STRING` present) connects to PostgreSQL, disables
  onboarding enablers, 404s `GET /api/config/demo`, and (defense in depth) refuses
  to authenticate any `@demo.local` account. Production is never seeded with demo
  accounts or the shared demo password.
- `DATABASE_URL` remains only the internal SQLite datasource for demo/tests;
  `DB_STRING` is the single operator-facing switch.
- **Startup guards (production only):** the server validates a strong `JWT_SECRET`
  (rejects the placeholder and secrets < 16 chars) and that the target DB is
  **provisioned** (schema present, `Setting.mode=production` latch set, at least one
  Admin). A configured-but-unprovisioned DB fails fast with a clear message rather
  than silently re-provisioning or falling back to demo. The server never creates
  schema, seeds data, or prompts for a password.

**Rationale:** One variable removes the ambiguous flag×DB matrix and the "flip the
flag back on" hole. "DB configured ⇒ production" is unambiguous, works identically
on-prem and cloud, and the DB-resident latch (§23) makes production one-way.

## 14. API & validation conventions

**Status:** confirmed

- **RESTful** resource endpoints (e.g. `/api/tasks`, `/api/issues`,
  `/api/feedback`, `/api/notes`, `/api/reports`, `/api/users`), JSON payloads,
  standard HTTP status codes, and a consistent error envelope.
- **Filtering** via query parameters (e.g. `?date=`, `?category=`, `?status=`,
  `?severity=`), matching the MANDATE's per-log filters; list endpoints support
  pagination.
- Request bodies validated server-side (Zod, per `techstack.md`); auth via JWT
  bearer tokens with role-based authorization enforcing §7.

**Rationale:** The MANDATE mandates a REST backend and per-field filters but not
the concrete API shape; these are conventional choices recorded for consistency.

## 15. Role-specific landing pages

**Status:** confirmed

Each role lands on a **separate** page after login (chosen over one role-aware
dashboard for maintainability):

| Role        | Landing route | Focus                                                                                                                       |
| ----------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Recruit** | `/dashboard`  | Their own onboarding progress: task counts/completion, open issues, recent entries.                                         |
| **Manager** | `/team`       | Team overview: each overseen recruit with per-recruit task completion, open issues, and entry counts; drill-in via Reports. |
| **Admin**   | `/overview`   | Organization overview: totals across users/departments plus quick links to user/department/category management.             |

- Login and any bare/unknown authenticated route **redirect to the role's landing
  route**. Each landing route is guarded so a user cannot open another role's
  landing page (e.g. a Recruit visiting `/team` or `/overview` is redirected).
- The existing per-log pages (`/tasks`, `/issues`, `/feedback`, `/notes`,
  `/reports`) remain shared and role-scoped by §7; `/admin` remains Admin-only.

**Rationale:** The MANDATE lists role-specific capabilities but not distinct
landings. Separate routes make each role's first screen purpose-built and easier
to evolve independently.

## 16. Demo credentials helper (demo mode only)

**Status:** confirmed

To make the seeded demo environment self-explanatory (usability, §9), the app can
surface the **provisioned demo accounts and their shared demo password** in the
onboarding UI (login helper + React Joyride).

**Security requirements (hard gate):**

- The demo-credentials endpoint (`GET /api/config/demo`) returns the demo account
  list + password **only when onboarding enablers are active** (i.e. demo mode,
  per §13). When enablers are off it returns **404 with no data**.
- The endpoint exposes a **static, code-defined list of the `@demo.local` seed
  accounts only** — it never queries the database for real users and never returns
  password hashes or any non-demo account. The "password" it returns is the
  well-known demo constant, never a real credential.
- This behavior is covered by tests asserting the account list and password are
  available in demo mode **and** unavailable (404) when demo mode is off.

**Rationale:** Showing the demo logins removes first-use friction, but must be
impossible outside demo mode; gating on the same flag that governs the demo
datasource keeps it safe and simple.

## 17. Step 3 extension feature — Onboarding checklist templates

**Status:** confirmed

The MANDATE's Step 3 asks for new features. The first is **reusable onboarding
checklist templates**:

- An **Admin** defines named **checklist templates**, optionally scoped to a
  target role and/or department. Each template has ordered **items** with a title,
  description, priority, an optional task category, and a **due offset in days**
  (relative to the recruit's start date).
- When provisioning (or editing) a recruit, the Admin may **apply a template**,
  which **auto-seeds the recruit's Task Log**: one Task per item, owned by the
  recruit, with `dueDate = startDate + dueOffsetDays` and status `To Do`.
- Templates are managed under **Admin → Templates**; full CRUD (create, rename,
  edit items, delete). Deleting a template does not delete already-seeded tasks.

**Access control:** template management is **Admin-only** (consistent with §10
provisioning). Seeded tasks belong to the recruit and follow the normal §7 scope.

**Enabler:** a React Joyride step introduces templates in the Admin area (demo
mode), and the demo seed ships example templates.

**Rationale:** Directly serves the "understand all features on first use" goal —
a new recruit starts with a ready-made, structured task list instead of a blank
log.

## 18. Step 3 extension feature — Task due dates & overdue reminders

**Status:** confirmed

- **Task** gains an optional **`dueDate`**. It is editable in the task form and
  set automatically for template-seeded tasks (§17).
- A task is **overdue** when it has a `dueDate` in the past **and** its status is
  not the semantic done status (§4). Overdue tasks show a clear **badge** in the
  Task Log, and the **Dashboard** shows an **overdue count** plus a reminder
  callout; the **team overview** surfaces per-recruit overdue counts for managers.
- Due dates are **date-only** and optional so existing tasks are unaffected. A due
  date is stored as midnight UTC of the chosen calendar day; a task is overdue once
  "today" (evaluated in the **task owner's timezone**, §20) has advanced past the
  due day, so a task due today is not yet overdue (end-of-day is local midnight).

**Enabler:** a React Joyride step highlights due dates / the overdue reminder.

**Rationale:** Overdue visibility is a high-usability, low-risk addition that
makes onboarding progress actionable for both recruits and managers.

## 19. Step 3 extension feature — Comments with @mentions & activity indicator

**Status:** confirmed

- Users can post **comments** on a **Task** (the primary diary entry). A comment
  has a body and an author; comments are ordered oldest-first.
- A comment body may **@mention** users using the handle derived from the account
  **email local-part** (e.g. `@manager.eng` for `manager.eng@demo.local`).
  Mentions are parsed server-side and resolved against existing users; unmatched
  tokens are ignored.
- Each resolved mention creates a **notification** for the mentioned user. A
  **bell/activity indicator** in the header shows the **unread mention count**; a
  panel lists recent mentions (who, on which task, snippet) and links to the task.
  Opening the panel / viewing a mention marks it read.

**Access control:**

- A user may comment on / read comments for a task only if the task's owner is
  within their §7 access scope (Recruit: own tasks; Manager: overseen recruits'
  tasks + own; Admin: all).
- Mentions are only created for users; a mention does **not** grant the mentioned
  user access to a task they otherwise cannot see — the activity panel links to
  the task but the task API still enforces §7.
- A user may only read/clear **their own** mentions.

**Enabler:** a React Joyride step points at the activity bell; the demo seed
includes example comments with mentions so the indicator is populated.

**Rationale:** Lightweight collaboration on onboarding entries; @mentions + an
activity indicator make hand-offs (e.g. a recruit flagging their manager) visible
without a heavyweight notification system.

## 20. Per-user timezone (admin-managed)

**Status:** confirmed

- Each **user** has an IANA **`timezone`** (e.g. `America/New_York`), defaulting to
  **`Asia/Kolkata`** when not specified. It is used to evaluate the end-of-day
  boundary for task overdue status (§18) in the task owner's local time.
- **All datetimes are stored as UTC timestamps.** The per-user timezone is applied
  only for local-calendar-day semantics (overdue evaluation) and for display; it is
  never used to alter how instants are persisted.
- The timezone is **provisioned and edited by an Admin only**, as part of user
  create/edit (§10). There is **no self-service profile page**, so a user cannot
  change their own timezone — consistent with the Admin-managed user model (§5/§10).
- Any valid IANA identifier is accepted (validated server-side via the Intl API);
  invalid identifiers are rejected with a 400. The Admin UI offers a picker of the
  runtime's supported zones (falling back to a curated shortlist) and always
  includes `UTC` plus any currently-stored value that the runtime enumeration omits,
  so a controlled `<select>` never silently changes a stored zone.
- The value is returned by user endpoints and on login / `GET /auth/me` so the
  client can evaluate overdue badges in the current user's timezone. It is never a
  secret and carries no password material. The Admin user list shows each zone with
  its current UTC offset for readability.

**Rationale:** "End of day" for overdue reminders is only meaningful relative to a
timezone. Storing UTC while defaulting users to `Asia/Kolkata` (the team's primary
locale) keeps instants unambiguous while making overdue semantics correct for
distributed teams, all without introducing a user-facing profile/settings surface.

## 21. Onboarding tour gated purely on demo mode

**Status:** confirmed

- The React Joyride onboarding tour is shown **only in demo mode** and is **never
  shown in production**. Demo mode always runs on the SQLite/in-memory database
  (never Postgres), so "demo mode" and "tour available" are the same condition.
- Finishing or skipping the tour **suppresses it for the rest of the current browser
  session** (recorded in `sessionStorage`, key `onboarding.tour.done`). **Restarting
  the app shows the tour again.** This balances easy onboarding against a
  distraction-free full experience once the tour has been seen.
- Suppression is deliberately **session-scoped, not persistent**: any stale
  `localStorage` flag from an earlier build is ignored and must not hide the tour.

**Rationale:** Demo mode exists to teach the app, so the tour should be available on
each fresh start; production users have real data and are never interrupted. A
session-scoped dismissal (vs. the old permanent global `localStorage` flag) lets a
user try the app distraction-free after the tour without permanently hiding it from
future demo sessions.

## 22. Task Log completeness (search, filtering, ownership, pagination, feedback)

**Status:** confirmed

- **Search** matches the task title or description (case-insensitive), alongside the
  existing status/category filters and a **date range** (from/to) over the entry
  `date` (§8).
- **Completed tasks are hidden by default**; a "Show completed" toggle reveals them.
  An explicit `Done` status filter still shows completed tasks. The dashboard
  overdue reminder deep-links here with completed hidden.
- The list is **paginated** client-side so it never grows unbounded.
- **Ownership:** Managers/Admins may assign a new task to a user within their §7
  access scope via an owner selector (defaults to themselves); Recruits may only
  create tasks for themselves. The server re-validates the requested owner and
  **ignores owner reassignment on edit**. Task reads include a limited
  `owner { id, name }` so Managers/Admins see whose task it is.
- **Destructive deletes are confirmed** via a shared confirmation dialog, and
  create/edit/delete across all entry logs surface **success/error toasts**.

**Rationale:** The mandate calls for a usable Task Log; date/search filtering,
hiding completed work by default, safe owner assignment, pagination, delete
confirmation, and feedback toasts make it complete, safe, and scalable.

## 23. Demo→production cutover via a standalone one-off setup tool

**Status:** confirmed

Provisioning a production database is an **explicit, interactive, one-off action
performed while still in demo mode** — never something the running API server does
on boot. It lives in a **separate `setup/` workspace** (its own Express process),
not in the always-on API server, so the production API has zero code path to create
schema, mint an admin, or write `.env` (smaller attack surface).

- **The setup tool only runs in demo mode.** Because it is a separate process it
  applies the same single signal: it **refuses to start** (and `POST /provision`
  returns 403) if `DB_STRING` is present in its own environment — i.e. already
  production. The target Postgres connection string is supplied in the request
  body, never via env.
- The operator opens the setup screen (default `http://localhost:4100`; the Admin
  overview links to it in demo mode) and submits: Postgres connection string,
  admin email/name/password, optional timezone. The tool then:
  1. applies the production schema (`prisma db push` against the Postgres schema),
  2. seeds **only** minimal reference data — the default **task categories**
     (`Training, Setup, Meeting, Documentation, Other`); no departments, users, or
     entries. Everything else is a code constant needing no DB row,
  3. creates the **first Admin** (bcrypt-hashed) **only if none exists** — it never
     resets an existing admin's password,
  4. sets the one-way latch `Setting.mode=production`,
  5. is fully **additive and idempotent** (no `deleteMany`),
  6. on-prem, writes `DB_STRING` + a generated strong `JWT_SECRET` to `.env`
     (mode `0600`; the admin password is never written), reusing an existing strong
     secret if present.
- **Persisting `DB_STRING`:** setting the environment variable is the canonical
  mechanism (works on-prem and cloud). Writing `.env` is an **on-prem convenience**
  only; on cloud the filesystem is ephemeral/read-only, so operators must set
  `DB_STRING` (and `JWT_SECRET`) in the platform's environment. The tool reports
  this.
- **Restart required:** the running server selects its Prisma client at process
  startup, so after provisioning the operator restarts the server (and stops the
  setup tool). On restart, `DB_STRING` is present ⇒ production; the startup guards
  (§13) confirm the DB is provisioned.
- **Testing:** a Testcontainers suite (`setup/test/integration`) provisions a fresh
  Postgres via the setup core, boots the real server API in production mode against
  it, and drives the full admin→manager→recruit workflow over HTTP (create
  departments, managers, recruits, reassign a recruit's manager, dashboards, create
  a task), asserting no demo accounts/password exist and `GET /api/config/demo` is
  404. A **production browser suite** (`e2e-prod/`, `npm run e2e:prod`) additionally
  cuts over a fresh Postgres, then builds the organization **through the UI** and
  re-runs the core UX flows on PostgreSQL (see docs/TESTING_STRATEGY.md).

**Rationale:** Making the cutover an interactive demo-mode action (not a boot-time
init) removes the headless "who supplies the first password" problem, keeps the
production server a pure read/validate data plane, and isolates the sensitive
provisioning code in a tool that cannot even run once production exists.
