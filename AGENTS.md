# AGENTS.md

Working instructions for AI agents (Devin and similar) contributing to Onboarding Diary. Human
contributors should read this too — it is the short version of the conventions that
[`docs/architecture.md`](docs/architecture.md) and [`docs/adr/`](docs/adr/README.md) justify.

Read before starting any task:
1. [`docs/requirements.md`](docs/requirements.md) — what the product must do.
2. [`docs/implementation-plan.md`](docs/implementation-plan.md) — which milestone the task belongs to.
3. [`docs/architecture.md`](docs/architecture.md) — how the system fits together.
4. The [ADRs](docs/adr/README.md) — only three are recorded (repository structure, stack,
   database); every other binding decision lives in the plan and architecture documents.

---

## 1. Non-negotiable rules

These come from decisions locked by the project owner. Do not "improve" past them; if a task
seems to require breaking one, stop and ask.

- **Commit to `main`.** No `devin/*` branches, no pull requests unless explicitly requested.
- **Do not implement anything that is not in the approved requirements.** No speculative
  features, no extra endpoints, no "while I was here" refactors.
- **Authentication is a JWT access token only.** Never add refresh tokens, token storage,
  rotation, reuse detection, or revocation lists.
- **No outbound email**, no mailer abstraction, no password-reset flow.
- **Deletes are hard deletes.** Never introduce `deleted_at` columns or global query filters.
- **Departments are seeded reference data.** No Department CRUD UI.
- **Schema grows per milestone.** Do not create tables for features you are not implementing in
  this task.
- **Never commit secrets.** The JWT signing key comes from configuration or environment
  variables; `onboardingdiary.db`, `.env` and build output are gitignored — keep them that way.
- **Do not edit an accepted ADR** to change a decision. Add a new ADR that supersedes it and
  update the old record's status.

---

## 2. Environment

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 10.0.400 | pinned in `global.json`; install with `dotnet-install.sh --channel 10.0` if absent |
| Node.js | 24 | `nvm use 24` |

The solution uses the SDK 10 XML solution format: it is `backend/OnboardingDiary.slnx`, **not**
`.sln`. Use the `.slnx` path in every `dotnet` command.

## 3. Commands

```bash
# backend
cd backend
dotnet build OnboardingDiary.slnx
dotnet test  OnboardingDiary.slnx
dotnet run --project src/OnboardingDiary.Api          # http://localhost:5276

# frontend
cd frontend
npm ci
npm run lint          # oxlint
npm run build         # tsc -b && vite build
npm run dev           # http://localhost:5173

# migrations (from backend/)
dotnet ef migrations add <Name> --project src/OnboardingDiary.Api
dotnet ef database update --project src/OnboardingDiary.Api
```

**Before every commit**: backend build + test, frontend lint + build. CI runs exactly these on
every push to `main` and is the only automated gate.

---

## 4. Where code goes

Backend is organised by feature, not by layer ([ADR-001](docs/adr/ADR-001-repository-structure.md)).
Adding a vertical slice means touching, for one feature:

| Path | What belongs there |
|---|---|
| `src/OnboardingDiary.Api/Endpoints/<Feature>Endpoints.cs` | route group + `TypedResults` handlers |
| `src/OnboardingDiary.Api/Features/<Feature>/` | request/response DTOs, validators, handler service |
| `src/OnboardingDiary.Api/Domain/` | entity + enums, **no EF Core attributes** |
| `src/OnboardingDiary.Api/Infrastructure/Configurations/` | `IEntityTypeConfiguration<T>` mapping |
| `src/OnboardingDiary.Api/Infrastructure/Migrations/` | one migration per schema-changing milestone |
| `src/OnboardingDiary.Api/Common/` | only genuinely cross-cutting code |
| `tests/OnboardingDiary.UnitTests/` | validators, state machines, permission rules |
| `tests/OnboardingDiary.IntegrationTests/` | endpoint tests per role |

Frontend mirrors the backend feature names in `frontend/src/features/<feature>/`. Anything used
by two or more features moves to `frontend/src/components/`. API types and the Axios client live
in `frontend/src/api/`; auth context and guards in `frontend/src/auth/`.

---

## 5. Backend conventions

- Minimal APIs grouped with `MapGroup("/api/v1/<resource>").RequireAuthorization()`, one static
  `*Endpoints.cs` class per feature, handlers returning `TypedResults`.
- **Every failure returns RFC 7807 `ProblemDetails`**; validation failures go through the shared
  endpoint filter as `ValidationProblem`.
- **Every list endpoint is paged**: `page`, `page_size` (default 20, max 100), `sort`, returning
  `{ items, page, page_size, total }`. Reuse the shared paging binder and response type.
- Shared filter parameter names: `from`, `to`, `q`, `user_id`.
- JSON is camelCase; dates ISO-8601; enums serialised as their string names.
- Status codes: 201 + `Location` on create, 204 on delete, 403 when authenticated but not
  permitted, **404 for resources outside the caller's scope** (do not leak existence), 409 on
  conflict.
- **Authorization is mandatory on every endpoint**: a claim policy (`AdminOnly`,
  `RecruitOnly`, `ManagerOrAdmin`) plus `EntryAccessHandler` for the relationship check whenever
  entry data is involved. Managers and admins never write entry data. Frontend guards are never
  a substitute.
- `Domain/` stays persistence-agnostic; mapping lives in `Infrastructure/Configurations/`.
- SQLite constraints to respect ([ADR-003](docs/adr/ADR-003-database-choice.md)): the database
  file is `onboardingdiary.db`; store emails lower-cased with a plain unique index,
  no array columns (tags live in `note_tags`), dates as ISO-8601 text via value converters.

## 6. Frontend conventions

- Data fetching is **React Query over an Axios client**
  ([ADR-002](docs/adr/ADR-002-frontend-and-backend-stack.md)). One configured Axios instance in
  `src/api/`; no bare `fetch` calls in components.
- Token is held in memory with a `sessionStorage` fallback; the Axios interceptor attaches it
  and, on 401, clears auth state and redirects to login preserving the attempted route.
- Server state goes through the React Query cache with explicit invalidation after mutations; no
  global client store.
- Forms use schema validation mirroring the server rules — the server stays authoritative.
- Every list screen needs loading, empty and error states, plus the shared filter bar; tables on
  desktop, cards on mobile.
- Accessibility is part of "done": keyboard-navigable forms and modals, labelled inputs,
  contrast ≥ 4.5:1, status and severity conveyed by text as well as colour.

---

## 7. Definition of done for a task

1. Code follows the placement and conventions above.
2. Unit tests for validators, state transitions and permission rules; integration tests for each
   new endpoint covering the happy path, a validation failure, and **each role**
   (`recruit-own`, `recruit-other`, `assigned-manager`, `unassigned-manager`, `admin`,
   `anonymous`).
3. Backend build + test and frontend lint + build all pass locally.
4. Documentation updated when behaviour or structure changed: `docs/requirements.md` for scope,
   `docs/architecture.md` for structure and conventions, a new ADR only for a genuinely
   architectural decision, `README.md` if commands or layout changed.
5. Committed to `main` with a Conventional Commit message (`feat:`, `fix:`, `docs:`, `chore:`,
   `test:`, `refactor:`), scoped to one logical change.

## 8. When to stop and ask

- The task appears to require breaking a rule in §1.
- Requirements and an ADR contradict each other (the ADRs and the implementation plan are the
  more recent source of truth — flag the mismatch rather than guessing).
- A decision you need is not recorded anywhere: only repository structure, stack and database
  have ADRs; the rest is in `docs/architecture.md` and `docs/implementation-plan.md`.
- A change would alter the API contract that existing frontend code depends on.
- A new third-party dependency is needed.
- CI fails for a reason unrelated to your change, or fails three times in a row.

## 9. Known open items

- `docs/requirements.md` is still at v0.2 and describes anonymous feedback, admin temporary
  passwords, and soft deletes. All three were removed by the locked decisions; the implementation
  plan wins. Alignment of that document is pending owner approval.
- The .NET assertion library and the frontend styling approach are not decided yet (see the
  follow-ups in the implementation plan).
- The repository has no remote yet; it will live at `codev-workshops/onboarding-diary`.
