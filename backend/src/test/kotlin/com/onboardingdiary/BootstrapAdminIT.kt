package com.onboardingdiary

import com.onboardingdiary.user.BootstrapAdminRunner
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.UserRepository
import com.onboardingdiary.user.UserStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.DefaultApplicationArguments
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient

@ActiveProfiles("dev")
class BootstrapAdminIT : AbstractIntegrationTest() {

    @Autowired lateinit var client: WebTestClient
    @Autowired lateinit var users: UserRepository
    @Autowired lateinit var runner: BootstrapAdminRunner
    @Autowired lateinit var jdbc: JdbcTemplate

    @Test
    fun `bootstrap admin is seeded ACTIVE with a BCrypt hash`() {
        val admin = users.findByEmail(ADMIN_EMAIL)
        assertNotNull(admin)
        assertEquals(Role.ADMIN, admin!!.role)
        assertEquals(UserStatus.ACTIVE, admin.status)
        assertNotNull(admin.activatedAt)
        val hash = jdbc.queryForObject("select password_hash from users where id = ?", String::class.java, admin.id)!!
        assertTrue(hash.startsWith("\$2a\$12\$"), "expected bcrypt strength-12 hash, got prefix ${hash.take(7)}")
        assertTrue(ADMIN_PASSWORD !in hash)
    }

    @Test
    fun `re-running the seeder is idempotent`() {
        val before = users.countByRole(Role.ADMIN)
        val seeded = users.findByEmail(ADMIN_EMAIL)!!
        runner.run(DefaultApplicationArguments())
        runner.run(DefaultApplicationArguments())
        assertEquals(before, users.countByRole(Role.ADMIN))
        assertEquals(seeded.updatedAt, users.findByEmail(ADMIN_EMAIL)!!.updatedAt)
        assertEquals(1, jdbc.queryForObject("select count(*) from users where email = ?", Int::class.java, ADMIN_EMAIL))
    }

    @Test
    fun `bootstrap admin can log in and read its profile without password_hash`() {
        val body = client.post().uri("/api/v1/auth/login")
            .bodyValue(mapOf("email" to ADMIN_EMAIL.uppercase(), "password" to ADMIN_PASSWORD))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.token").isNotEmpty
            .jsonPath("$.user.role").isEqualTo("ADMIN")
            .jsonPath("$.user.status").isEqualTo("ACTIVE")
            .jsonPath("$.user.passwordHash").doesNotExist()
            .jsonPath("$.user.password_hash").doesNotExist()
            .returnResult().responseBody!!.decodeToString()
        assertTrue("password" !in body.lowercase().replace("\"password\"", ""), body)
    }
}
