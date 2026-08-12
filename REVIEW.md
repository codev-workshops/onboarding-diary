# Review Guidelines

Onboarding Diary. Backend: .NET 8, layered as `OnboardingDiary.Api` (controllers) →
`OnboardingDiary.Application` (interfaces, DTOs, validators) → `OnboardingDiary.Infrastructure`
(EF Core, services), tests in `OnboardingDiary.Tests`. Frontend: Next.js app router under `frontend/`.
Auth is JWT access tokens + rotating refresh tokens; users have roles and a lockout counter.

## Priorities (in order)
1. Authentication / authorization bypass, token handling, secrets exposure
2. Data loss or non-reversible schema change
3. Correctness bugs in role scoping, reports, and CRUD ownership checks
4. Everything else

Do not comment on formatting that the analyzers and Prettier already enforce.

## Critical areas — always scrutinize

### Auth (`backend/OnboardingDiary.Infrastructure/Auth/`, `Api/Controllers/AuthController.cs`)
- Login, refresh, forgot-password, and reset-password must be indistinguishable to an attacker probing
  for valid accounts: identical response shape and status for unknown email vs. wrong password.
- Refresh tokens must be stored hashed, single-use, rotated on refresh, revoked on password reset, and
  expiry-checked server-side. Flag any comparison of a raw token against a stored raw token.
- Password-reset tokens must be single-use, expiring, and generated with a cryptographic RNG —
  flag `Random`, `Guid.NewGuid()`, or timestamps used as token material.
- Lockout state must be persisted before the failure response is returned, and cleared on success.
- Flag any JWT validation that disables issuer, audience, lifetime, or signature validation.

### Secrets & configuration (`appsettings*.json`, `Program.cs`)
- No real signing key, admin password, SMTP credential, or connection string with a password may be
  committed. A placeholder is fine only if the code fails fast when it is still the placeholder —
  flag silent fallbacks to a default key.
- CORS must be an explicit origin list. Flag `AllowAnyOrigin`, and flag `AllowAnyHeader()` +
  `AllowAnyMethod()` combined with `AllowCredentials()`.
- Cookies carrying tokens must set `HttpOnly`, `Secure`, and `SameSite`.

### Authorization on every endpoint (`Api/Controllers/`)
- Every new action needs an explicit `[Authorize]` (with roles where relevant); relying on a global
  default silently is a bug, not a nit. Flag every new `[AllowAnonymous]` and say why it's risky.
- Non-admin users must only see their own rows: flag any query in `Infrastructure/**/*Service.cs` that
  loads by id without also constraining on the caller's user id (or an explicit admin/manager branch).
- Reports and admin user management are the highest-risk surfaces for missing scoping.

### EF Core migrations (`Infrastructure/Persistence/Migrations/`)
- Must be backward compatible with the currently deployed version: no column drop or rename in the same
  PR that stops writing to it.
- Flag a non-nullable column added without a default, and any destructive `Sql()` in `Up` without a
  matching `Down`.
- The hand-written migration and the model must agree; flag a migration edited by hand in ways the
  snapshot does not reflect.

### Frontend (`frontend/`)
- Tokens must not be written to `localStorage`; auth state belongs in the existing auth context.
- No `any` and no non-null `!` on API responses in `frontend/lib/api.ts` — narrow the type.
- Never pass server or user strings to `dangerouslySetInnerHTML`.
- Error paths must render a message; flag `catch {}` blocks that swallow failures.

## Conventions
- Controllers stay thin: validation via the `IValidator<T>` pattern already in `Application/`, business
  logic in `Infrastructure` services.
- No `DateTime.Now` — always `DateTime.UtcNow`.
- Never log tokens, password hashes, reset links, or full email bodies.
- Every new endpoint needs at least one test for the unauthorized case and one for the wrong-owner case.

## Ignore
- `frontend/package-lock.json` and any lock file — skip unless a dependency was added or upgraded, and
  then only note license or known-CVE concerns.
- `**/Migrations/*.Designer.cs` and `**/AppDbContextModelSnapshot.cs` — EF-generated, skip.
- `**/*.module.css` — styling only, skip unless it changes layout semantics or hides an interactive element.
- Test snapshots and formatter-only diffs — skip.

## Performance
- Flag queries inside loops and N+1 access through EF navigation properties; name the fix
  (`Include` / projection) at the line.
- Flag list endpoints without pagination, `ToList()` followed by in-memory filtering, and `Count()`
  where `Any()` belongs.
- Flag synchronous I/O in an async path (`.Result`, `.Wait()`).

## Comment style
- One comment per distinct issue, on the exact line, with a suggested diff when the fix is a few lines.
- State the impact concretely: "a member can fetch another member's issue entry by guessing the id".
- If you are not sure it is a defect, raise it as a flag with the question you would ask the author.
