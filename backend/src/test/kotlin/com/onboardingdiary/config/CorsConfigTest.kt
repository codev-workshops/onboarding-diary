package com.onboardingdiary.config

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.boot.test.context.runner.ReactiveWebApplicationContextRunner
import org.springframework.web.cors.reactive.CorsConfigurationSource

class CorsConfigTest {

    private val runner = ReactiveWebApplicationContextRunner().withUserConfiguration(CorsConfig::class.java)

    @Test
    fun `prod without APP_CORS_ALLOWED_ORIGINS fails startup with a clear message`() {
        runner.withPropertyValues("spring.profiles.active=prod").run { ctx ->
            assertTrue(ctx.startupFailure != null)
            val root = generateSequence(ctx.startupFailure) { it.cause }.last()
            assertEquals(CorsConfig.MISSING_ORIGINS_MESSAGE, root.message)
        }
    }

    @Test
    fun `prod rejects wildcard origins`() {
        runner.withPropertyValues("spring.profiles.active=prod", "app.cors.allowed-origins=*").run { ctx ->
            val root = generateSequence(ctx.startupFailure) { it.cause }.last()
            assertEquals(CorsConfig.WILDCARD_MESSAGE, root.message)
        }
    }

    @Test
    fun `prod exposes exactly one restricted source when origins are set`() {
        runner.withPropertyValues(
            "spring.profiles.active=prod",
            "app.cors.allowed-origins=https://a.example.com,https://b.example.com",
        ).run { ctx ->
            assertEquals(1, ctx.getBeansOfType(CorsConfigurationSource::class.java).size)
            assertTrue(ctx.containsBean("restrictedCorsConfigurationSource"))
        }
    }

    @Test
    fun `dev and qa expose the permissive source`() {
        listOf("dev", "qa").forEach { profile ->
            runner.withPropertyValues("spring.profiles.active=$profile").run { ctx ->
                assertTrue(ctx.containsBean("permissiveCorsConfigurationSource"))
            }
        }
    }

    @Test
    fun `parseAllowedOrigins trims and drops empty entries`() {
        assertEquals(
            listOf("https://a.example.com", "https://b.example.com"),
            CorsConfig.parseAllowedOrigins(" https://a.example.com ,, https://b.example.com "),
        )
        assertThrows<IllegalStateException> { CorsConfig.parseAllowedOrigins("  ,  ") }
    }
}
