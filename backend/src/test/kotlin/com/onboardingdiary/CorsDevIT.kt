package com.onboardingdiary

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient

@ActiveProfiles("dev")
class CorsDevIT : AbstractIntegrationTest() {

    @Autowired
    lateinit var client: WebTestClient

    @Test
    fun `preflight from any origin is allowed with wildcard and no credentials`() {
        client.options().uri("/api/v1/auth/login")
            .header(HttpHeaders.ORIGIN, "http://localhost:3000")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.POST.name())
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,content-type")
            .exchange()
            .expectStatus().isOk
            .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .expectHeader().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS)
            .expectHeader().value(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS) { assert(it.contains("POST")) }
            .expectHeader().exists(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS)
    }

    @Test
    fun `preflight from an arbitrary remote origin is also allowed`() {
        client.options().uri("/api/v1/auth/login")
            .header(HttpHeaders.ORIGIN, "https://anything.example.org")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, HttpMethod.GET.name())
            .exchange()
            .expectStatus().isOk
            .expectHeader().valueEquals(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
    }
}
