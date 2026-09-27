package com.onboardingdiary.security

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "app.jwt")
data class JwtProperties(
    /** HS256 signing secret; at least 32 bytes (256 bits). */
    val secret: String,
    val ttl: Duration = Duration.ofMinutes(60),
    val issuer: String = "onboarding-diary",
)

@ConfigurationProperties(prefix = "app.security")
data class PasswordEncoderProperties(
    /** `bcrypt` (default, strength 12) or `argon2` (Argon2id). */
    val passwordEncoder: String = "bcrypt",
    val bcryptStrength: Int = 12,
)

@ConfigurationProperties(prefix = "app.bootstrap-admin")
data class BootstrapAdminProperties(
    val email: String? = null,
    val password: String? = null,
    val fullName: String = "Administrator",
)
