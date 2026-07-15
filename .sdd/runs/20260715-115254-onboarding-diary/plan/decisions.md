# Planning Decisions

- **run_id:** `20260715-115254-onboarding-diary`
- **spec_revision:** `sdd-v1-ef4af20389bc`
- **status:** `APPROVED_FROZEN`
- **clarification source:** `.sdd/runs/20260715-115254-onboarding-diary/plan/clarifications.json`

All material choices are resolved. Planner judgments below are limited to choices expressly authorized by Q-002 and Q-007 through Q-013.

## ADR-001 — Intentionally ephemeral single-process storage

- **Status:** Accepted
- **Context:** The invocation mandates in-memory SQLite and Q-001 confirms that data may be lost on restart.
- **Choice:** Use one backend process and one in-memory SQLite database. Restart creates an empty database and a new bootstrap Admin.
- **Alternatives:** Durable SQLite file or snapshot/restore; rejected for this MVP because they contradict the confirmed ephemeral scope or add unnecessary complexity.
- **Consequences:** Users, sessions, assignments, and diary entries do not survive restart; multi-worker backend execution is out of scope.
- **Affected IDs:** `REQ-015`, `E005-S001`, `G-A`, `RISK-001`.

## ADR-002 — Safe role provisioning and one-manager assignment

- **Status:** Accepted
- **Context:** Q-002 authorizes the simplest safe provisioning choice; Q-003 and Q-004 define role powers and Admin-managed assignments.
- **Choice:** Public sign-up always creates a Recruit. The initial Admin is bootstrapped from required environment variables. Admins create Manager/Admin accounts and role changes. Each Recruit has zero or one Manager, maintained only by an Admin.
- **Alternatives:** Public role selection, invite workflows, many-to-many management; rejected due to privilege risk or unnecessary complexity.
- **Consequences:** Client-supplied role/assignment fields are rejected; every diary/report operation is server-scoped by owner or assignment.
- **Affected IDs:** `REQ-001`–`REQ-004`, `REQ-013`, `E001`, `G-A`, `G-B`, `RISK-002`, `RISK-003`.

## ADR-003 — Email/password with opaque cookie session and minimal REST errors

- **Status:** Accepted
- **Context:** Q-010 and Q-011 authorize a simple authentication and JSON REST contract.
- **Choice:** Email is the username. Passwords use PBKDF2-HMAC-SHA256 with random salt and at least 310,000 iterations. Login creates a cryptographically random server-side session in an `HttpOnly`, `SameSite=Lax` cookie for eight hours; logout invalidates it. API endpoints live under `/api` and use the documented status codes and error envelope.
- **Alternatives:** JWT bearer tokens, external identity, persistent sessions; rejected as unnecessary for this local MVP.
- **Consequences:** Sessions disappear on restart; Vite uses a same-origin proxy; generic `401` avoids account enumeration; no lockout/password reset/MFA is included.
- **Affected IDs:** `REQ-001`, `REQ-003`, `REQ-017`, `E001-S001`, `E005-S003`, `G-A`, `G-G`, `RISK-005`.

## ADR-004 — Minimal field and dashboard contracts

- **Status:** Accepted
- **Context:** Q-007 and Q-008 authorize minimal enums, validation, scope, ordering, limits, and calculations.
- **Choice:** Use the exact field table in specification section 6. Dashboard targets one authorized Recruit, counts all four diary types, returns ten recent records ordered by date/created timestamp/ID descending, calculates completed/all tasks rounded to a whole percent, and treats Open/In Progress issues as open.
- **Alternatives:** Configurable taxonomies, pagination, charts, trend analytics; rejected as extension scope.
- **Consequences:** Backend and frontend share one finite validation/test matrix; zero tasks yields `0%`.
- **Affected IDs:** `REQ-002`, `REQ-005`–`REQ-010`, `E002`, `E003`, `G-C`, `G-D`, `G-E`, `RISK-004`, `RISK-006`.

## ADR-005 — One-recruit inclusive PDF/CSV report contract

- **Status:** Accepted
- **Context:** Q-009 authorizes a minimal report contract.
- **Choice:** Reports target one authorized Recruit, use inclusive dates, support tasks/issues/feedback/combined, use the exact columns and ordering in specification section 9, return UTF-8 RFC 4180 CSV or a readable metadata-bearing PDF, and download a valid empty artifact when no rows match.
- **Alternatives:** Multi-recruit, summary analytics, scheduled delivery, notes reports; rejected because the BRD does not require them.
- **Consequences:** Parser-based tests verify content and filenames; report authorization reuses role/assignment scope.
- **Affected IDs:** `REQ-011`–`REQ-013`, `E004`, `G-F`, `RISK-007`.

## ADR-006 — Extension features deferred from MVP generation

- **Status:** Accepted
- **Context:** Q-012 explicitly excludes the two additional features from this MVP.
- **Choice:** Preserve `REQ-018`, `E006`, `E006-S001`, `E006-S002`, and `G-H` as deferred stable IDs, mark them non-MVP and generation-ineligible, and exclude `G-H` from execution waves.
- **Alternatives:** Select and implement two features now; rejected by the confirmed clarification.
- **Consequences:** MVP approval and completion do not depend on extensions. A separate approved post-MVP revision must select and fully specify two features before implementation.
- **Affected IDs:** `REQ-018`, `E006`, `G-H`, `RISK-009`.

## ADR-007 — Mandated technology stack

- **Status:** Accepted
- **Context:** The invocation overrides the BRD's candidate-choice note.
- **Choice:** React + Vite + Tailwind CSS frontend, Python FastAPI backend, and in-memory SQLite.
- **Alternatives:** None within this run.
- **Consequences:** All active implementation groups use this simple stack and no production deployment infrastructure is planned.
- **Affected IDs:** `REQ-015`, `REQ-016`, `E005`, `G-A`.

## ADR-008 — Minimal responsive and failure matrix

- **Status:** Accepted
- **Context:** Q-013 authorizes a minimal browser/viewport and user-visible failure contract.
- **Choice:** Test current Playwright Chromium at `390x844` and `1280x720`; prohibit page-level horizontal overflow; use inline `422` field errors, login redirect on `401`, access-denied on `403`, not-found on `404`, and generic retryable banners for network/`500` failures. Report failures create no partial file.
- **Alternatives:** Multi-browser/device certification and advanced offline recovery; rejected as unnecessary for the MVP.
- **Consequences:** G-G has a finite Playwright and fault-injection matrix.
- **Affected IDs:** `REQ-014`, `REQ-017`, `E005-S002`, `E005-S003`, `G-G`, `RISK-008`.
