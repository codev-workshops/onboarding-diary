package com.onboardingdiary.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.CorsConfigurationSource
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource

/**
 * Profile-scoped CORS (REQ-FUNC-097). The bearer token travels in a header, so
 * credentials (cookies) are never allowed.
 */
@Configuration(proxyBeanMethods = false)
class CorsConfig {

    @Bean
    @Profile("dev", "qa")
    fun permissiveCorsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            addAllowedOrigin(CorsConfiguration.ALL)
            addAllowedMethod(CorsConfiguration.ALL)
            addAllowedHeader(CorsConfiguration.ALL)
            EXPOSED_HEADERS.forEach(::addExposedHeader)
            allowCredentials = false
            maxAge = 3600
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", config) }
    }

    @Bean
    @Profile("prod")
    fun restrictedCorsConfigurationSource(
        @Value("\${app.cors.allowed-origins:}") rawAllowedOrigins: String,
    ): CorsConfigurationSource {
        val origins = parseAllowedOrigins(rawAllowedOrigins)
        val config = CorsConfiguration().apply {
            allowedOrigins = origins
            addAllowedMethod(CorsConfiguration.ALL)
            addAllowedHeader(CorsConfiguration.ALL)
            EXPOSED_HEADERS.forEach(::addExposedHeader)
            allowCredentials = false
            maxAge = 3600
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", config) }
    }

    companion object {
        /** Non-safelisted response headers the browser client reads (S8 report downloads). */
        val EXPOSED_HEADERS = listOf("Content-Disposition", "X-Report-Omitted")

        const val MISSING_ORIGINS_MESSAGE =
            "APP_CORS_ALLOWED_ORIGINS must be set to a comma-separated list of allowed origins when the 'prod' profile is active."
        const val WILDCARD_MESSAGE = "APP_CORS_ALLOWED_ORIGINS must not contain a wildcard ('*') origin."

        fun parseAllowedOrigins(raw: String): List<String> {
            val origins = raw.split(',').map { it.trim() }.filter { it.isNotEmpty() }
            if (origins.isEmpty()) throw IllegalStateException(MISSING_ORIGINS_MESSAGE)
            if (origins.any { it.contains('*') }) throw IllegalStateException(WILDCARD_MESSAGE)
            return origins
        }
    }
}
