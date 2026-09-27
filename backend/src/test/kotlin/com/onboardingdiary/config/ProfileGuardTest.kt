package com.onboardingdiary.config

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder
import org.springframework.context.annotation.Configuration

class ProfileGuardTest {

    @Configuration(proxyBeanMethods = false)
    class EmptyConfig

    @Test
    fun `context fails to start when no profile is active`() {
        val ex = assertThrows<IllegalStateException> {
            SpringApplicationBuilder(EmptyConfig::class.java)
                .web(WebApplicationType.NONE)
                .run()
        }
        assertEquals(ProfileGuard.MESSAGE, ex.message)
    }

    @Test
    fun `context starts when a profile is active`() {
        SpringApplicationBuilder(EmptyConfig::class.java)
            .web(WebApplicationType.NONE)
            .run("--spring.profiles.active=dev")
            .use { ctx -> assertEquals(listOf("dev"), ctx.environment.activeProfiles.toList()) }
    }
}
