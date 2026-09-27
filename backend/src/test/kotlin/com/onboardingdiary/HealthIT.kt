package com.onboardingdiary

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient

@ActiveProfiles("dev")
class HealthIT : AbstractIntegrationTest() {

    @Autowired
    lateinit var client: WebTestClient

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
    fun `health is served outside the versioned api base path`() {
        client.get().uri("/api/v1/health")
            .exchange()
            .expectStatus().isUnauthorized
    }
}
