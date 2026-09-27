---
name: backend-auth-and-errors
description: How to add a secured endpoint in the Kotlin/WebFlux backend — principal, role checks, request DTO validation, ApiException + ErrorCode catalog, and the integration-test pattern (Testcontainers + AuthIT-style login).
---

# Backend auth & error conventions (frozen in S1)

## Secured suspend endpoint

```kotlin
@RestController
@RequestMapping("/api/v1/tasks")
class TaskController(private val service: TaskService) {

    @PostMapping
    suspend fun create(
        @AuthenticationPrincipal principal: AuthenticatedUser, // role/status loaded from DB per request
        @Valid @RequestBody request: CreateTaskRequest,
    ): TaskResponse {
        if (principal.role != Role.MANAGER && principal.role != Role.ADMIN) throw ForbiddenException()
        return service.create(principal.id, request)
    }
}
```

Only `GET /health`, `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`
are public (`SecurityConfig`). Everything else is authenticated by default —
do not add `permitAll` for new routes.

## Request DTOs

```kotlin
data class CreateTaskRequest(
    @field:NotBlank @field:Size(max = 200) val title: String?,   // nullable => missing field -> REQUIRED
    @field:ValidStartDate val dueDate: LocalDate? = null,
) {
    override fun toString() = "CreateTaskRequest(title=$title)"   // never include secrets
}
```

Use `@ValidEmail`, `@ValidPassword`, `@ValidStartDate` from
`com.onboardingdiary.validation`; normalize emails with
`EmailNormalizer.normalize()` before lookups.

## Errors

- Throw `ApiException` subclasses from services; add a subclass in
  `api/error/ApiException.kt` if the catalog code has none yet.
- `ErrorCode` already contains every code from requirements §5.2 — reference,
  never invent.
- `GlobalErrorHandler` renders the envelope; never build error JSON by hand.

## Response DTOs

Build from the entity field-by-field (`UserProfile.from(user, createdBy)`);
never serialize `User` (it carries `passwordHash`).

## Blocking JDBC

Repositories are plain `JdbcTemplate` classes; call them inside
`withContext(Dispatchers.IO)` from services. Password hashing/matching runs on
`Dispatchers.Default` (`AuthService.encode/matches`).

## Integration test pattern

```kotlin
@ActiveProfiles("dev")
class TaskIT : AbstractIntegrationTest() {
    @Autowired lateinit var client: WebTestClient
    @Autowired lateinit var users: UserRepository
    @Autowired lateinit var passwordEncoder: PasswordEncoder

    private fun activeUser(role: Role) = users.insert(
        "u.${UUID.randomUUID().toString().take(8)}@example.com",
        passwordEncoder.encode("Str0ngPassword!"), role, UserStatus.ACTIVE,
        "Test User", null, null, null, Instant.now(),
    )

    private fun token(email: String): String = /* POST /api/v1/auth/login, read $.token */

    @Test fun `recruit cannot create tasks`() {
        client.post().uri("/api/v1/tasks")
            .header(HttpHeaders.AUTHORIZATION, "Bearer ${token(activeUser(Role.NEW_RECRUIT).email)}")
            .bodyValue(mapOf("title" to "x")).exchange()
            .expectStatus().isForbidden
            .expectBody().jsonPath("$.code").isEqualTo("FORBIDDEN")
    }
}
```

Always cover: 401 without token, 403 for each disallowed role, 400 with
`details[].field`, and the happy path — see `AuthIT` for the reference matrix.
