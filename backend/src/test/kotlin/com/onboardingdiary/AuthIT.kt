package com.onboardingdiary

import com.onboardingdiary.security.JwtProperties
import com.onboardingdiary.security.JwtService
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserRepository
import com.onboardingdiary.user.UserStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.test.web.reactive.server.WebTestClient.ResponseSpec
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@ActiveProfiles("dev")
class AuthIT : AbstractIntegrationTest() {

    @Autowired lateinit var client: WebTestClient
    @Autowired lateinit var users: UserRepository
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var passwordEncoder: PasswordEncoder
    @Autowired lateinit var jwtProperties: JwtProperties

    private val password = "Str0ngPassword!"

    private fun unique(prefix: String) = "$prefix.${UUID.randomUUID().toString().take(8)}@example.com"

    private fun invited(email: String = unique("invited"), role: Role = Role.NEW_RECRUIT): User =
        users.insert(email, null, role, UserStatus.INVITED, "Invited Person", "Engineering", null, adminId(), null)

    private fun active(email: String = unique("active"), role: Role = Role.NEW_RECRUIT, pwd: String = password): User =
        users.insert(email, passwordEncoder.encode(pwd), role, UserStatus.ACTIVE, "Active Person", null, null, adminId(), Instant.now())

    private fun deactivated(email: String = unique("gone")): User =
        users.insert(email, passwordEncoder.encode(password), Role.NEW_RECRUIT, UserStatus.DEACTIVATED, "Gone Person", null, null, adminId(), Instant.now())

    private fun adminId(): UUID = users.findByEmail(ADMIN_EMAIL)!!.id

    private fun post(path: String, body: Any, token: String? = null): ResponseSpec =
        client.post().uri(path).also { if (token != null) it.header(HttpHeaders.AUTHORIZATION, "Bearer $token") }
            .bodyValue(body).exchange()

    private fun login(email: String, pwd: String = password): String =
        post("/api/v1/auth/login", mapOf("email" to email, "password" to pwd))
            .expectStatus().isOk
            .expectBody().jsonPath("$.token").isNotEmpty
            .returnResult().responseBody!!.decodeToString()
            .let { TOKEN.find(it)!!.groupValues[1] }

    private fun ResponseSpec.expectError(status: Int, code: String, path: String): WebTestClient.BodyContentSpec =
        expectStatus().isEqualTo(status)
            .expectBody()
            .jsonPath("$.code").isEqualTo(code)
            .jsonPath("$.message").isNotEmpty
            .jsonPath("$.details").isArray
            .jsonPath("$.timestamp").isNotEmpty
            .jsonPath("$.path").isEqualTo(path)

    // ---- signup ----------------------------------------------------------

    @Test
    fun `signup activates an INVITED user, stores a bcrypt hash and returns a token`() {
        val user = invited()
        val body = post("/api/v1/auth/signup", mapOf("email" to user.email, "password" to password, "fullName" to "Jane Doe", "startDate" to "2026-10-01"))
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.token").isNotEmpty
            .jsonPath("$.expiresAt").isNotEmpty
            .jsonPath("$.user.id").isEqualTo(user.id.toString())
            .jsonPath("$.user.status").isEqualTo("ACTIVE")
            .jsonPath("$.user.fullName").isEqualTo("Jane Doe")
            .jsonPath("$.user.department").isEqualTo("Engineering")
            .jsonPath("$.user.startDate").isEqualTo("2026-10-01")
            .jsonPath("$.user.activatedAt").isNotEmpty
            .jsonPath("$.user.createdBy.email").isEqualTo(ADMIN_EMAIL)
            .jsonPath("$.user.passwordHash").doesNotExist()
            .returnResult().responseBody!!.decodeToString()
        assertFalse(body.contains("\$2a\$"), body)

        val stored = users.findById(user.id)!!
        assertEquals(UserStatus.ACTIVE, stored.status)
        assertNotNull(stored.activatedAt)
        assertTrue(stored.passwordHash!!.startsWith("\$2a\$12\$"))
        assertTrue(passwordEncoder.matches(password, stored.passwordHash))
    }

    @Test
    fun `signup normalizes the email before lookup`() {
        val user = invited()
        post("/api/v1/auth/signup", mapOf("email" to "  ${user.email.uppercase()} ", "password" to password))
            .expectStatus().isOk
            .expectBody().jsonPath("$.user.email").isEqualTo(user.email)
    }

    @Test
    fun `signup with unknown email is 403 NOT_INVITED and creates nothing`() {
        val email = unique("nobody")
        post("/api/v1/auth/signup", mapOf("email" to email, "password" to password))
            .expectError(403, "NOT_INVITED", "/api/v1/auth/signup")
        assertEquals(null, users.findByEmail(email))
    }

    @Test
    fun `signup for ACTIVE or DEACTIVATED account is 409 ACCOUNT_ALREADY_ACTIVATED`() {
        post("/api/v1/auth/signup", mapOf("email" to active().email, "password" to password))
            .expectError(409, "ACCOUNT_ALREADY_ACTIVATED", "/api/v1/auth/signup")
        post("/api/v1/auth/signup", mapOf("email" to deactivated().email, "password" to password))
            .expectError(409, "ACCOUNT_ALREADY_ACTIVATED", "/api/v1/auth/signup")
    }

    @Test
    fun `signup with invalid email and weak password is 400 VALIDATION_FAILED with field details`() {
        post("/api/v1/auth/signup", mapOf("email" to "not-an-email", "password" to "short"))
            .expectError(400, "VALIDATION_FAILED", "/api/v1/auth/signup")
            .jsonPath("$.details[?(@.field == 'email')].code").isEqualTo("INVALID_FORMAT")
            .jsonPath("$.details[?(@.field == 'password')].code").isEqualTo("INVALID_FORMAT")
    }

    @Test
    fun `signup with missing fields reports REQUIRED and a far-future start date is OUT_OF_RANGE`() {
        post("/api/v1/auth/signup", mapOf("startDate" to LocalDate.now().plusYears(2).toString()))
            .expectError(400, "VALIDATION_FAILED", "/api/v1/auth/signup")
            .jsonPath("$.details[?(@.field == 'email')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'password')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'startDate')].code").isEqualTo("OUT_OF_RANGE")
    }

    @Test
    fun `malformed json is 400 MALFORMED_REQUEST`() {
        client.post().uri("/api/v1/auth/login")
            .header(HttpHeaders.CONTENT_TYPE, "application/json")
            .bodyValue("{not json")
            .exchange()
            .expectError(400, "MALFORMED_REQUEST", "/api/v1/auth/login")
    }

    // ---- login -----------------------------------------------------------

    @Test
    fun `login succeeds for ACTIVE user with normalized email`() {
        val user = active()
        post("/api/v1/auth/login", mapOf("email" to " ${user.email.uppercase()} ", "password" to password))
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.token").isNotEmpty
            .jsonPath("$.user.email").isEqualTo(user.email)
            .jsonPath("$.user.passwordHash").doesNotExist()
    }

    @Test
    fun `login is a uniform 401 INVALID_CREDENTIALS for unknown, wrong password, INVITED and DEACTIVATED`() {
        val cases = listOf(
            unique("unknown") to password,
            active().email to "WrongPassword1",
            invited().email to password,
            deactivated().email to password,
        )
        val bodies = cases.map { (email, pwd) ->
            post("/api/v1/auth/login", mapOf("email" to email, "password" to pwd))
                .expectError(401, "INVALID_CREDENTIALS", "/api/v1/auth/login")
                .jsonPath("$.details").isEmpty
                .returnResult().responseBody!!.decodeToString()
        }
        val messages = bodies.map { MESSAGE.find(it)!!.groupValues[1] }.toSet()
        assertEquals(1, messages.size, "error message must not reveal which factor failed: $messages")
    }

    @Test
    fun `login with invalid payload is 400 VALIDATION_FAILED`() {
        post("/api/v1/auth/login", mapOf("email" to "bad", "password" to ""))
            .expectError(400, "VALIDATION_FAILED", "/api/v1/auth/login")
            .jsonPath("$.details[?(@.field == 'email')]").exists()
            .jsonPath("$.details[?(@.field == 'password')]").exists()
    }

    // ---- token / principal ---------------------------------------------

    @Test
    fun `me without token, with malformed token or with wrong secret is 401 UNAUTHENTICATED`() {
        client.get().uri("/api/v1/me").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")
            .returnResult().responseHeaders.let { assertTrue(it.getFirst(HttpHeaders.WWW_AUTHENTICATE)!!.startsWith("Bearer")) }
        client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer garbage").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")
        client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Basic abc").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")

        val forged = JwtService(JwtProperties(secret = "wrong-secret-0123456789abcdef-0123456789")).issue(active().id, "x@example.com", Role.ADMIN)
        client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer ${forged.token}").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")
    }

    @Test
    fun `expired token is 401 UNAUTHENTICATED`() {
        val user = active()
        val past = Clock.fixed(Instant.now().minus(Duration.ofHours(2)), ZoneOffset.UTC)
        val expired = JwtService(jwtProperties, past).issue(user.id, user.email, user.role)
        client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer ${expired.token}").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")
    }

    @Test
    fun `valid token of a user deactivated afterwards is 401 and role comes from the DB not the claim`() {
        val user = active()
        val token = login(user.email)
        jdbc.update("update users set role = 'ADMIN' where id = ?", user.id)
        client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token").exchange()
            .expectStatus().isOk.expectBody().jsonPath("$.role").isEqualTo("ADMIN")

        jdbc.update("update users set status = 'DEACTIVATED' where id = ?", user.id)
        client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")

        jdbc.update("delete from users where id = ?", user.id)
        client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")
    }

    @Test
    fun `unknown route under the api is 404 NOT_FOUND when authenticated and 401 when not`() {
        client.get().uri("/api/v1/does-not-exist").exchange().expectError(401, "UNAUTHENTICATED", "/api/v1/does-not-exist")
        val token = login(active().email)
        client.get().uri("/api/v1/does-not-exist").header(HttpHeaders.AUTHORIZATION, "Bearer $token").exchange()
            .expectError(404, "NOT_FOUND", "/api/v1/does-not-exist")
    }

    // ---- /me -------------------------------------------------------------

    @Test
    fun `me returns the full profile for every role`() {
        for (role in Role.entries) {
            val user = active(role = role)
            val token = login(user.email)
            client.get().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token").exchange()
                .expectStatus().isOk
                .expectBody()
                .jsonPath("$.id").isEqualTo(user.id.toString())
                .jsonPath("$.email").isEqualTo(user.email)
                .jsonPath("$.role").isEqualTo(role.name)
                .jsonPath("$.status").isEqualTo("ACTIVE")
                .jsonPath("$.invitedAt").isNotEmpty
                .jsonPath("$.createdAt").isNotEmpty
                .jsonPath("$.updatedAt").isNotEmpty
                .jsonPath("$.createdBy.id").isEqualTo(adminId().toString())
                .jsonPath("$.passwordHash").doesNotExist()
        }
    }

    @Test
    fun `patch me updates fullName department and startDate`() {
        val token = login(active().email)
        client.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .bodyValue(mapOf("fullName" to "New Name", "department" to "Sales", "startDate" to "2026-11-02"))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.fullName").isEqualTo("New Name")
            .jsonPath("$.department").isEqualTo("Sales")
            .jsonPath("$.startDate").isEqualTo("2026-11-02")
    }

    @Test
    fun `patch me with only fullName leaves department and startDate untouched`() {
        val token = login(active().email)
        client.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .bodyValue(mapOf("department" to "Sales", "startDate" to "2026-11-02")).exchange().expectStatus().isOk
        client.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .bodyValue(mapOf("fullName" to "Only Name"))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.fullName").isEqualTo("Only Name")
            .jsonPath("$.department").isEqualTo("Sales")
            .jsonPath("$.startDate").isEqualTo("2026-11-02")
    }

    @Test
    fun `patch me with explicit nulls clears department and startDate`() {
        val token = login(active().email)
        client.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .bodyValue(mapOf("department" to "Sales", "startDate" to "2026-11-02")).exchange().expectStatus().isOk
        client.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue("""{"department": null, "startDate": null}""")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.department").isEqualTo(null)
            .jsonPath("$.startDate").isEqualTo(null)
    }

    @Test
    fun `patch me rejects blank fullName and too-long department`() {
        val token = login(active().email)
        client.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .bodyValue(mapOf("fullName" to "   ", "department" to "d".repeat(101)))
            .exchange()
            .expectError(400, "VALIDATION_FAILED", "/api/v1/me")
            .jsonPath("$.details[?(@.field == 'fullName')].code").isEqualTo("INVALID_FORMAT")
            .jsonPath("$.details[?(@.field == 'department')].code").isEqualTo("TOO_LONG")
    }

    @Test
    fun `activate is a no-op once the account is no longer INVITED`() {
        val user = active()
        val result = users.activate(user.id, "\$2a\$12\$otherhash", "Hijacker", null, null)
        assertNull(result)
        val reloaded = users.findById(user.id)!!
        assertEquals(user.passwordHash, reloaded.passwordHash)
        assertEquals(user.fullName, reloaded.fullName)
    }

    @Test
    fun `patch me rejects too-long name and far-future start date with field details`() {
        val token = login(active().email)
        client.patch().uri("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .bodyValue(mapOf("fullName" to "x".repeat(101), "startDate" to LocalDate.now().plusYears(1).plusDays(1).toString()))
            .exchange()
            .expectError(400, "VALIDATION_FAILED", "/api/v1/me")
            .jsonPath("$.details[?(@.field == 'fullName')].code").isEqualTo("TOO_LONG")
            .jsonPath("$.details[?(@.field == 'startDate')].code").isEqualTo("OUT_OF_RANGE")
    }

    @Test
    fun `patch me without token is 401`() {
        client.patch().uri("/api/v1/me").bodyValue(mapOf("fullName" to "x")).exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/me")
    }

    // ---- password ----------------------------------------------------------

    @Test
    fun `change password verifies the current one, rotates the hash and old password stops working`() {
        val user = active()
        val token = login(user.email)
        val newPassword = "EvenStr0nger!!"

        post("/api/v1/me/password", mapOf("currentPassword" to "nope-nope-1", "newPassword" to newPassword), token)
            .expectError(400, "INVALID_CURRENT_PASSWORD", "/api/v1/me/password")

        post("/api/v1/me/password", mapOf("currentPassword" to password, "newPassword" to "weak"), token)
            .expectError(400, "VALIDATION_FAILED", "/api/v1/me/password")
            .jsonPath("$.details[?(@.field == 'newPassword')]").exists()

        post("/api/v1/me/password", mapOf("currentPassword" to password, "newPassword" to newPassword), token)
            .expectStatus().isNoContent

        post("/api/v1/auth/login", mapOf("email" to user.email, "password" to password))
            .expectError(401, "INVALID_CREDENTIALS", "/api/v1/auth/login")
        login(user.email, newPassword)
        assertTrue(users.findById(user.id)!!.passwordHash!!.startsWith("\$2a\$12\$"))
    }

    // ---- logout ----------------------------------------------------------

    @Test
    fun `logout is 204 when authenticated and 401 otherwise`() {
        val token = login(active().email)
        client.post().uri("/api/v1/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer $token").exchange()
            .expectStatus().isNoContent
        client.post().uri("/api/v1/auth/logout").exchange()
            .expectError(401, "UNAUTHENTICATED", "/api/v1/auth/logout")
    }

    companion object {
        private val TOKEN = Regex("\"token\"\\s*:\\s*\"([^\"]+)\"")
        private val MESSAGE = Regex("\"message\"\\s*:\\s*\"([^\"]+)\"")
    }
}
