package com.onboardingdiary

import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserRepository
import com.onboardingdiary.user.UserStatus
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpHeaders
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.test.web.reactive.server.WebTestClient.RequestHeadersSpec
import org.springframework.test.web.reactive.server.WebTestClient.ResponseSpec
import java.time.Instant
import java.util.UUID

/** Fixtures + login helpers shared by the S2 integration tests (see backend/AGENTS.md). */
abstract class AbstractAuthenticatedIntegrationTest : AbstractIntegrationTest() {

    @Autowired lateinit var client: WebTestClient
    @Autowired lateinit var users: UserRepository
    @Autowired lateinit var passwordEncoder: PasswordEncoder

    protected val password = "Str0ngPassword!"

    protected fun unique(prefix: String) = "$prefix.${UUID.randomUUID().toString().take(8)}@example.com"

    protected fun adminId(): UUID = users.findByEmail(ADMIN_EMAIL)!!.id

    protected fun active(role: Role, fullName: String = "Active ${role.name}", email: String = unique(role.name.lowercase())): User =
        users.insert(email, passwordEncoder.encode(password), role, UserStatus.ACTIVE, fullName, null, null, adminId(), Instant.now())

    protected fun invited(role: Role = Role.NEW_RECRUIT, fullName: String = "Invited ${role.name}", email: String = unique("invited")): User =
        users.insert(email, null, role, UserStatus.INVITED, fullName, null, null, adminId(), null)

    protected fun deactivated(role: Role = Role.NEW_RECRUIT): User =
        users.insert(unique("gone"), passwordEncoder.encode(password), role, UserStatus.DEACTIVATED, "Gone", null, null, adminId(), Instant.now())

    protected fun login(email: String, pwd: String = password): String =
        client.post().uri("/api/v1/auth/login").bodyValue(mapOf("email" to email, "password" to pwd)).exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.token").isNotEmpty
            .returnResult().responseBody!!.decodeToString()
            .let { TOKEN.find(it)!!.groupValues[1] }

    protected fun adminToken(): String = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    private fun RequestHeadersSpec<*>.bearer(token: String?): ResponseSpec {
        if (token != null) header(HttpHeaders.AUTHORIZATION, "Bearer $token")
        return exchange()
    }

    protected fun get(path: String, token: String?): ResponseSpec = client.get().uri(path).bearer(token)

    protected fun post(path: String, body: Any?, token: String?): ResponseSpec =
        client.post().uri(path).let { if (body != null) it.bodyValue(body) else it }.bearer(token)

    protected fun patch(path: String, body: Any, token: String?): ResponseSpec =
        client.patch().uri(path).bodyValue(body).bearer(token)

    protected fun ResponseSpec.expectError(status: Int, code: String): WebTestClient.BodyContentSpec =
        expectStatus().isEqualTo(status)
            .expectBody()
            .jsonPath("$.code").isEqualTo(code)
            .jsonPath("$.message").isNotEmpty
            .jsonPath("$.details").isArray
            .jsonPath("$.timestamp").isNotEmpty

    protected fun ResponseSpec.json(): String = returnResult(String::class.java).responseBody.blockFirst() ?: ""

    protected fun String.jsonId(field: String = "id"): UUID =
        UUID.fromString(Regex("\"$field\"\\s*:\\s*\"([0-9a-f-]{36})\"").find(this)!!.groupValues[1])

    companion object {
        val TOKEN = Regex("\"token\"\\s*:\\s*\"([^\"]+)\"")
    }
}
