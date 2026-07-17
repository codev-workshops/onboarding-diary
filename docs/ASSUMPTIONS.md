# Assumptions & Decisions

This document records every decision that is **not** explicitly specified in
[`MANDATE.md`](./MANDATE.md). Each item includes a rationale and a status:

- **confirmed** — settled for the purpose of this exercise.
- **pending confirmation** — needs product-owner sign-off before implementation
  begins.

> **✅ Product-owner sign-off received.** All previously-open items have been
> confirmed and implementation can begin:
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
> - Demo seed data & demo accounts on first boot — multiple departments, managers,
>   and recruits (§9)
> - User provisioning model — Admin-created, no open self-registration (§10)
> - Reports — render on screen first, then export to PDF/CSV (§11)
> - Demo-mode feature flag driving datasource + onboarding enablers (§13)

---

## 1. Authentication model

**Status:** confirmed

- **Role model:** Multi-user with three roles — **Recruit**, **Manager**,
  **Admin** — per the MANDATE.
- **Auth mechanism:** **JWT** (JSON Web Tokens). The API is a stateless REST
  backend, so bearer tokens fit the architecture. Passwords are stored using a
  modern adaptive hash (bcrypt).
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
features depend on the *semantic meaning* of each value.

### Tier 1 — Admin-configurable

- **Task `category`** is managed by the Admin, who can **add, rename, and delete**
  categories at runtime.
- Deleting a category still referenced by existing task entries must be a
  **soft-disable / archive** (mark inactive so it no longer appears when creating
  or filtering new tasks) rather than a **hard delete**, to avoid orphaning
  existing task entries.
- Category is safe to make free-form/admin-editable because no feature relies on
  the specific *meaning* of any given category — it is used only for grouping and
  filtering.

### Tier 2 — Seeded defaults (system-defined in v1, not free-form editable)

The following are **seeded** on first boot and are **system-defined** in v1; they
are **not** free-form editable by the Admin:

- Task `status`
- Task `priority`
- Issue `severity`
- Issue `status`

**Rationale:** the Dashboard and Reports depend on the *semantic meaning* of these
values, not just their labels. For example:

- "Task completion progress" needs to know *which* status means **done**.
- "Open issues at a glance" needs to know *which* issue statuses count as **open**
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
  membership attribute of users, *not* the mechanism that drives oversight.
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
  point stands (no immutable `createdAt` rule is needed *for the entry date*).

**Rationale:** Standard persistence practice; needed for "recent entries" ordering
without conflating with the user-entered event date.

## 13. Demo mode feature flag (drives datasource + enablers)

**Status:** confirmed

Behavior is governed by a single **demo-mode feature flag**:

| Flag | Production DB configured? | Datasource used | Onboarding enablers |
| ---- | ------------------------- | --------------- | ------------------- |
| **ON**  | (ignored)  | **Demo** (SQLite/in-memory) | **On** |
| **OFF** | Yes        | **Production** (e.g. PostgreSQL) | Off |
| **OFF** | No         | **Demo** (fallback) | Off |

- **Flag ON** → demo database **and** onboarding enablers (tooltips / coach marks /
  welcome mats) are active.
- **Flag OFF** → use the **production** database if one is configured; if none is
  configured, fall back to the demo database. Either way the enablers are **off**.
- An Admin can toggle the flag; a fresh install defaults the flag **ON**.

**Rationale:** Framing §2's behavior as one demo feature flag covers every case
cleanly, including the edge case of the flag being off before a production DB is
configured (fall back to the demo DB but without the enablers).

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
