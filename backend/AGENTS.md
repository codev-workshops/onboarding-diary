# AGENTS.md — backend

Backend service for Onboarding Diary. See the root `AGENTS.md` for project-wide
context and the Git workflow.

## Stack

- **Kotlin** on **JDK 24**
- **Spring Boot 4.x** on **Spring Framework 7**
- **Spring WebFlux** with **Kotlin coroutines**
- **PostgreSQL** for persistence
- **JUnit 5** + **Testcontainers** for tests
- **Logback** (Spring Boot default) for logging

### Why JDK 24

JDK 24 is a non-LTS release. It was chosen deliberately for
[JEP 491](https://openjdk.org/jeps/491) (*Synchronize Virtual Threads without
Pinning*): `synchronized` blocks no longer pin virtual threads to their carrier
thread. This makes blocking JDBC drivers and connection pools (which use
`synchronized` internally) safe to run on virtual threads without the pinning
concerns that existed on JDK 21.

## Architecture: reactive-first with coroutines

- The application is built on Spring WebFlux (Netty), not Spring MVC.
- REST controller handler methods are `suspend` functions. Do not return
  `Mono<T>` from controllers when a `suspend fun` returning `T` will do.
- Prefer plain sequential coroutine code over reactive operator chains.

### Blocking calls: `withContext(Dispatchers.IO)` by default

Any blocking call (JDBC, blocking SDKs, file I/O, etc.) must be offloaded so it
never blocks a Netty event-loop thread. The default convention is:

```kotlin
suspend fun findEntry(id: Long): DiaryEntry? = withContext(Dispatchers.IO) {
    jdbcRepository.findById(id)
}
```

Do **not** rewrite blocking code as reactive-style code, and do **not** wrap a
single blocking call in a `Flow` just to make it "reactive". A `suspend`
function running on `Dispatchers.IO` is the idiom.

### Virtual-thread dispatcher (opt-in)

For high-concurrency blocking workloads (many concurrent JDBC calls, fan-out to
blocking SDKs) a virtual-thread-backed dispatcher is available as an opt-in:

```kotlin
val VirtualThreads: CoroutineDispatcher =
    Executors.newVirtualThreadPerTaskExecutor().asCoroutineDispatcher()

suspend fun bulkImport(rows: List<Row>) = withContext(VirtualThreads) {
    rows.forEach { jdbcRepository.insert(it) }
}
```

Because we run on JDK 24 (JEP 491), `synchronized` inside JDBC drivers and
connection pools no longer pins virtual threads, so pinning is not a concern.
Use `Dispatchers.IO` unless you have a measured reason to switch.

### Non-blocking clients: `WebClient` called directly

Outbound HTTP uses Spring `WebClient`, which is already non-blocking. Call it
directly from `suspend` functions using the coroutine extensions:

```kotlin
suspend fun fetchProfile(userId: String): Profile =
    webClient.get()
        .uri("/users/{id}", userId)
        .retrieve()
        .awaitBody()
```

Do **not** wrap `WebClient` calls in `withContext(Dispatchers.IO)` or the
virtual-thread dispatcher — that only wastes a thread for an operation that
does not block.

### SSE / streaming: return `Flow<T>`

Server-sent event endpoints return `Flow<T>` (or `Flux<T>`) from the handler.
This is the intended use of `Flow` — a genuinely streaming response — in
contrast to the rule above about not using `Flow` for simple blocking calls.

```kotlin
@GetMapping("/diary/{id}/events", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
fun events(@PathVariable id: Long): Flow<DiaryEvent> = eventService.stream(id)
```

## Persistence

- PostgreSQL is the only supported database.
- Data access may use blocking JDBC (offloaded per the conventions above).

## Authentication & authorization (frozen in S1)

- Email / password login (email normalized to trimmed lowercase, unique).
  `EmailNormalizer.normalize()` before every lookup/persist; `@ValidEmail`,
  `@ValidPassword` (10–128 chars, letter + digit) and `@ValidStartDate` live in
  `com.onboardingdiary.validation`.
- Store only salted, hashed passwords using the `PasswordEncoder` bean
  (`SecurityConfig`): BCrypt strength 12 by default, Argon2id via
  `APP_PASSWORD_ENCODER=argon2`. Never log or return password material —
  `User.toString()` and every DTO omit `passwordHash`; DTOs are built
  field-by-field (`UserProfile.from`), never by serializing the entity.
- JWT: `JwtService` issues/verifies HS256 tokens (claims `sub`, `email`,
  `role`, `iat`, `exp`; TTL `APP_JWT_TTL`, default 60m; secret
  `APP_JWT_SECRET` ≥ 32 bytes). The `role` claim is informational only.
- Principal: `JwtAuthenticationManager` loads the user from the DB on **every**
  request and only authenticates `ACTIVE` users; controllers receive
  `@AuthenticationPrincipal principal: AuthenticatedUser` with the DB role.
- `SecurityWebFilterChain` (`SecurityConfig`): public = `GET /health`,
  `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `OPTIONS *`;
  everything else requires a bearer token. Add role checks per endpoint with
  the principal's role (later slices), never from the JWT claim.
- Bootstrap admin: `BootstrapAdminRunner` seeds one ACTIVE `ADMIN` from
  `APP_BOOTSTRAP_ADMIN_EMAIL` / `APP_BOOTSTRAP_ADMIN_PASSWORD` when no ADMIN
  exists (idempotent). Signup never creates users; it completes an `INVITED`
  row.

### Shared authorization helpers (S2/S3/S5 — reuse, do not fork)

- `AssignmentGuard.isActivelyAssigned(managerId, recruitId)` (S2): live lookup
  of the current ACTIVE assignment on every call; never cache across requests.
- `RecruitScopeResolver.resolveTargetRecruit(principal, recruitId?)` (S3): for
  list endpoints — recruit → self, manager → assigned recruit or 403
  `NOT_ASSIGNED`, admin → any.
- `FeedbackVisibility.canRead(principal, recruitId)` (S5,
  `com.onboardingdiary.feedback.FeedbackVisibility`): decision D3 =
  owner ∨ ADMIN ∨ (MANAGER ∧ `isActivelyAssigned`). Use it wherever feedback
  content may surface — S5 detail endpoints (`requireCanRead` → 404
  `NOT_FOUND`, never 403, so non-visible notes are indistinguishable from
  missing ones), S7 timeline (omit the feedback block when `false`) and S8
  reports (omit feedback or reject the report type when `false`). Because it
  delegates to the live guard, a reassignment flips the answer on the very
  next request.

## Errors (REQ-FUNC-090)

- Every error body is the `ErrorResponse` envelope
  `{ code, message, details[], timestamp, path }` written by
  `ErrorResponseWriter`; `GlobalErrorHandler` (order -2) maps all exceptions,
  including Spring Security entry point / access denied.
- `ErrorCode` (`api/error/ErrorCode.kt`) is the **complete** catalog from
  `docs/detailed-requirements.md` §5.2 with its HTTP status. Later slices only
  reference codes; do not add ad-hoc strings. Throw an `ApiException` subclass
  (`NotInvitedException`, `NotFoundException`, ...) from services.
- Bean Validation failures become `400 VALIDATION_FAILED` with one
  `details[]` entry per field (`code` ∈ `DetailCode`: REQUIRED, INVALID_FORMAT,
  TOO_LONG, OUT_OF_RANGE, INVALID_ENUM, INVALID_TRANSITION). Request DTO
  fields are nullable so a missing field yields `REQUIRED`, not
  `MALFORMED_REQUEST`.
- Uniform `401 INVALID_CREDENTIALS` for unknown email / wrong password /
  INVITED / DEACTIVATED on login; `401 UNAUTHENTICATED` for missing, invalid,
  expired tokens and for deactivated users with a valid token.

## Request logging

- `RequestLoggingFilter` logs `method path -> status (ms)` only. Never log
  headers, bodies, tokens, passwords or hashes; request DTOs override
  `toString()` to drop secrets.

## Configuration & profiles

- Profiles: `dev`, `qa` (identical to dev), `prod`. `SPRING_PROFILES_ACTIVE`
  is mandatory — `ProfileGuard` aborts startup when no profile is active.
- Environment-driven settings: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`,
  `APP_CORS_ALLOWED_ORIGINS` (required in `prod`, comma-separated, no `*`),
  `APP_JWT_SECRET` (required, ≥ 32 bytes), `APP_JWT_TTL` (default `60m`),
  `APP_PASSWORD_ENCODER` (`bcrypt` | `argon2`), `APP_BOOTSTRAP_ADMIN_EMAIL`,
  `APP_BOOTSTRAP_ADMIN_PASSWORD`, `APP_BOOTSTRAP_ADMIN_FULL_NAME`.
- CORS is a profile-scoped `CorsConfigurationSource` bean in `CorsConfig`;
  dev/qa are permissive without credentials, prod is an explicit allow-list.
- Schema changes go through Flyway migrations in
  `src/main/resources/db/migration` (`V<n>__<name>.sql`). Every table carries
  `created_at` / `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- `GET /health` is the Actuator health endpoint (public, outside `/api/v1`).

## Testing

- JUnit 5 for unit and integration tests.
- Integration tests that touch the database use Testcontainers to start a real
  Postgres instance; do not use H2 or other substitutes. Extend
  `AbstractIntegrationTest` (sets datasource, JWT secret and bootstrap admin
  `admin@example.com` / `AdminPass123!`); create fixtures through
  `UserRepository.insert(...)` and obtain tokens via `POST /api/v1/auth/login`
  as `AuthIT` does.
- If Maven Central rate-limits (HTTP 429) locally, drop a Gradle init script
  in `~/.gradle/init.d/` that puts
  `https://maven-central.storage-download.googleapis.com/maven2/` first; the
  Dockerfile accepts the same script as the `gradle-init` build secret.

## Logging

- Use Spring Boot's built-in Logback via SLF4J. Do not add another logging
  backend.
