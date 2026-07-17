# Assumptions & Decisions

This document records every decision that is **not** explicitly specified in
[`MANDATE.md`](./MANDATE.md). Each item includes a rationale and a status:

- **confirmed** — settled for the purpose of this exercise.
- **pending confirmation** — needs product-owner sign-off before implementation
  begins.

> **⚠️ Requires product-owner sign-off before implementation begins:**
> - Storage engine default (first-boot behavior)
> - Chosen tech stack
> - Enum value sets (task category/status/priority, issue severity/status)
> - Manager→Recruit oversight assignment mechanism
>
> These items are marked **pending confirmation** below.

---

## 1. Authentication model

**Status:** pending confirmation (mechanism/password rules) · confirmed (role model)

- **Role model:** Multi-user with three roles — **Recruit**, **Manager**,
  **Admin** — per the MANDATE. *(confirmed)*
- **Auth mechanism:** Server-side **session cookies** (HTTP-only, secure,
  `SameSite=Lax`) rather than JWT. Rationale: this is a stateful web app with a
  server-rendered/SPA client; sessions are simpler to reason about, revocable,
  and avoid client-side token storage risks. *(pending confirmation)*
- **Password rules:** Minimum 8 characters, at least one letter and one number;
  stored using a modern adaptive hash (bcrypt/argon2); no forced rotation.
  *(pending confirmation)*

**Rationale:** The MANDATE specifies email/password auth and three roles but not
the session/JWT choice or password policy.

## 2. Storage & first-boot behavior

**Status:** pending confirmation

- On **first boot**, the application starts with an **in-memory (or SQLite)**
  database and **active onboarding enablers** — tooltips / coach marks /
  welcome mats delivered via an onboarding UI library — to guide the very first
  users.
- Once an **admin configures a production database** (e.g., PostgreSQL) and data
  is populated, the **onboarding enablers are disabled** automatically.

**Rationale:** This first-boot experience is a **product-owner addition** and is
**not** in the MANDATE, which only requires generic "database persistence". The
default storage engine and the enabler-disable trigger need sign-off.

## 3. Tech stack

**Status:** pending confirmation

The MANDATE delegates the stack to the candidate ("tech stack is candidate's
choice"). Proposed selections to be recorded/confirmed:

- **Frontend framework:** _to be recorded_ (e.g., React).
- **Backend:** _to be recorded_ (e.g., Node.js/Express or similar).
- **Build tooling:** _to be recorded_ (e.g., Vite).
- **Testing tools:** _to be recorded_ (e.g., Vitest/Jest + Playwright).
- **PDF/CSV report libraries:** _to be recorded_ (e.g., a PDF generation library
  and a CSV serialization library).

**Rationale:** Concrete choices affect implementation and must be fixed before
building; recorded here for sign-off.

## 4. Enum value sets

**Status:** pending confirmation

Feedback **type** is already fixed by the MANDATE to **Positive | Suggestion |
Concern**. The following sets are proposed and need confirmation:

- **Task category:** `Training`, `Setup`, `Meeting`, `Documentation`, `Other`.
- **Task status:** `Not Started`, `In Progress`, `Blocked`, `Done`.
- **Task priority:** `Low`, `Medium`, `High`.
- **Issue severity:** `Low`, `Medium`, `High`, `Critical`.
- **Issue status:** `Open`, `In Progress`, `Resolved`, `Closed`.

**Rationale:** The MANDATE names these fields but does not enumerate their allowed
values; filtering and reporting depend on a fixed set.

## 5. Manager → Recruit oversight

**Status:** pending confirmation

- **Assumption:** An **Admin assigns** recruits to managers (explicit
  assignment), establishing the oversight relationship used for manager reports
  and access control.
- **Open question:** Whether oversight should instead (or additionally) be
  **department-based** (a manager automatically oversees recruits in their
  department).

**Rationale:** The MANDATE says managers report on recruits they oversee but does
not define how that relationship is established.

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
