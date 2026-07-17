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
