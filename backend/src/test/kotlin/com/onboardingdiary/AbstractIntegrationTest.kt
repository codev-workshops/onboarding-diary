package com.onboardingdiary

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.postgresql.PostgreSQLContainer

/**
 * Base class for integration tests: real Postgres via Testcontainers (never
 * H2), one shared container for the whole JVM, WebTestClient bound to a random
 * port. Subclasses pick the profile with `@ActiveProfiles`.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
abstract class AbstractIntegrationTest {

    companion object {
        const val JWT_SECRET = "integration-test-jwt-secret-0123456789abcdef"
        const val ADMIN_EMAIL = "admin@example.com"
        const val ADMIN_PASSWORD = "AdminPass123!"

        val postgres: PostgreSQLContainer = PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("onboarding_diary")
            .withUsername("onboarding")
            .withPassword("onboarding")
            .also { it.start() }

        @JvmStatic
        @DynamicPropertySource
        fun datasourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { postgres.jdbcUrl }
            registry.add("spring.datasource.username") { postgres.username }
            registry.add("spring.datasource.password") { postgres.password }
            registry.add("app.jwt.secret") { JWT_SECRET }
            registry.add("app.bootstrap-admin.email") { ADMIN_EMAIL }
            registry.add("app.bootstrap-admin.password") { ADMIN_PASSWORD }
        }
    }
}
