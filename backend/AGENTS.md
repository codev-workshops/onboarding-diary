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

## Authentication

- Email / password login (email normalized to trimmed lowercase, unique).
- Store only salted, hashed passwords using BCrypt or Argon2 (Spring Security
  `PasswordEncoder`). Never log or return password material.

## Configuration & profiles

- Profiles: `dev`, `qa` (identical to dev), `prod`. `SPRING_PROFILES_ACTIVE`
  is mandatory — `ProfileGuard` aborts startup when no profile is active.
- Environment-driven settings: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`,
  `APP_CORS_ALLOWED_ORIGINS` (required in `prod`, comma-separated, no `*`).
- CORS is a profile-scoped `CorsConfigurationSource` bean in `CorsConfig`;
  dev/qa are permissive without credentials, prod is an explicit allow-list.
- Schema changes go through Flyway migrations in
  `src/main/resources/db/migration` (`V<n>__<name>.sql`). Every table carries
  `created_at` / `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- `GET /health` is the Actuator health endpoint (public, outside `/api/v1`).

## Testing

- JUnit 5 for unit and integration tests.
- Integration tests that touch the database use Testcontainers to start a real
  Postgres instance; do not use H2 or other substitutes.

## Logging

- Use Spring Boot's built-in Logback via SLF4J. Do not add another logging
  backend.
