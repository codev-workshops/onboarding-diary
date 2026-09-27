package com.onboardingdiary.config

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.boot.WebApplicationType
import org.springframework.boot.builder.SpringApplicationBuilder
import org.springframework.context.annotation.Configuration

class ProdDatasourceTest {

    @Configuration(proxyBeanMethods = false)
    class EmptyConfig

    @Test
    fun `prod has no fallback database credentials`() {
        SpringApplicationBuilder(EmptyConfig::class.java)
            .web(WebApplicationType.NONE)
            .run("--spring.profiles.active=prod")
            .use { ctx ->
                listOf("spring.datasource.url", "spring.datasource.username", "spring.datasource.password").forEach { key ->
                    val ex = assertThrows<IllegalArgumentException>("$key must have no default in prod") {
                        ctx.environment.getProperty(key)
                    }
                    assertTrue("DB_" in (ex.message ?: ""), ex.message)
                }
            }
    }
}
