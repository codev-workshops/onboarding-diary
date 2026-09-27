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
        }
    }
}
