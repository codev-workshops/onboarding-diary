package com.onboardingdiary

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.reactive.server.WebTestClient

@ActiveProfiles("prod")
@TestPropertySource(properties = ["APP_CORS_ALLOWED_ORIGINS=https://diary.example.com, https://staging.example.com"])
class CorsProdIT : AbstractIntegrationTest() {

    @Autowired
    lateinit var client: WebTestClient

    @Test
    fun `preflight from a listed origin is allowed and echoes that origin`() {
        client.options().uri("/api/v1/auth/login")
            .header(HttpHeaders.ORIGIN, "https://staging.example.com")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name())
            .exchange()
            .expectStatus().isOk
            .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://staging.example.com")
            .expectHeader().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS)
    }

    @Test
    fun `preflight from an unlisted origin is rejected without CORS headers`() {
        client.options().uri("/api/v1/auth/login")
            .header(HttpHeaders.ORIGIN, "https://evil.example.net")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name())
            .exchange()
            .expectStatus().isForbidden
            .expectHeader().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)
    }

    @Test
    fun `health stays public under prod`() {
        client.get().uri("/health")
            .exchange()
            .expectStatus().isOk
            .expectBody().jsonPath("$.status").isEqualTo("UP")
    }
}
