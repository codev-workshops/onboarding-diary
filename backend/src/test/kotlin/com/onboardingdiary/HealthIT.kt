package com.onboardingdiary

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.env.Environment
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient

@ActiveProfiles("dev")
class HealthIT : AbstractIntegrationTest() {

    @Autowired
    lateinit var client: WebTestClient

    @Autowired
    lateinit var environment: Environment

    @Test
    fun `GET health is public and reports UP including the database`() {
        client.get().uri("/health")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo("UP")
            .jsonPath("$.components.db.status").isEqualTo("UP")
    }

    @Test
    fun `dev exposes info and metrics behind authentication`() {
        val exposed = environment.getProperty("management.endpoints.web.exposure.include", "").split(",")
        assertTrue(exposed.containsAll(listOf("health", "info", "metrics")), exposed.toString())
        listOf("/info", "/metrics").forEach { path ->
            client.get().uri(path).exchange().expectStatus().isUnauthorized
        }
    }

    @Test
    fun `health is served outside the versioned api base path`() {
        client.get().uri("/api/v1/health")
            .exchange()
            .expectStatus().isUnauthorized
    }
}
