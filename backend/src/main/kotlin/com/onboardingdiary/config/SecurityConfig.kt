package com.onboardingdiary.config

import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorResponseWriter
import com.onboardingdiary.security.BearerTokenConverter
import com.onboardingdiary.security.BootstrapAdminProperties
import com.onboardingdiary.security.JwtAuthenticationManager
import com.onboardingdiary.security.JwtProperties
import com.onboardingdiary.security.PasswordEncoderProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity
import org.springframework.security.config.web.server.SecurityWebFiltersOrder
import org.springframework.security.config.web.server.ServerHttpSecurity
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.server.SecurityWebFilterChain
import org.springframework.security.web.server.ServerAuthenticationEntryPoint
import org.springframework.security.web.server.authentication.AuthenticationWebFilter
import org.springframework.security.web.server.authentication.ServerAuthenticationEntryPointFailureHandler
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository
import org.springframework.web.cors.reactive.CorsConfigurationSource
import java.time.Clock

/**
 * Stateless JWT security. Public: `POST /auth/signup`, `POST /auth/login`,
 * `GET /health` (and CORS preflight). Everything else needs a bearer token
 * that resolves to an ACTIVE user; failures render the `ErrorResponse`
 * envelope (`401 UNAUTHENTICATED` / `403 FORBIDDEN`).
 */
@Configuration(proxyBeanMethods = false)
@EnableWebFluxSecurity
@EnableConfigurationProperties(JwtProperties::class, PasswordEncoderProperties::class, BootstrapAdminProperties::class)
class SecurityConfig {

    @Bean
    fun clock(): Clock = Clock.systemUTC()

    @Bean
    fun passwordEncoder(props: PasswordEncoderProperties): PasswordEncoder =
        when (props.passwordEncoder.lowercase()) {
            "bcrypt" -> BCryptPasswordEncoder(props.bcryptStrength)
            "argon2", "argon2id" -> Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()
            else -> throw IllegalStateException(
                "app.security.password-encoder must be 'bcrypt' or 'argon2' (was '${props.passwordEncoder}')",
            )
        }

    @Bean
    fun securityWebFilterChain(
        http: ServerHttpSecurity,
        corsConfigurationSource: CorsConfigurationSource,
        authenticationManager: JwtAuthenticationManager,
        bearerTokenConverter: BearerTokenConverter,
        errorWriter: ErrorResponseWriter,
    ): SecurityWebFilterChain {
        val entryPoint = ServerAuthenticationEntryPoint { exchange, _ ->
            errorWriter.write(exchange, ErrorCode.UNAUTHENTICATED)
        }
        val jwtFilter = AuthenticationWebFilter(authenticationManager).apply {
            setServerAuthenticationConverter(bearerTokenConverter)
            setAuthenticationFailureHandler(ServerAuthenticationEntryPointFailureHandler(entryPoint))
            setSecurityContextRepository(NoOpServerSecurityContextRepository.getInstance())
        }
        return http
            .cors { it.configurationSource(corsConfigurationSource) }
            .csrf { it.disable() }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .logout { it.disable() }
            .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
            .addFilterAt(jwtFilter, SecurityWebFiltersOrder.AUTHENTICATION)
            .exceptionHandling {
                it.authenticationEntryPoint(entryPoint)
                it.accessDeniedHandler { exchange, _ -> errorWriter.write(exchange, ErrorCode.FORBIDDEN) }
            }
            .authorizeExchange {
                it.pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                it.pathMatchers(HttpMethod.GET, "/health").permitAll()
                it.pathMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login").permitAll()
                it.anyExchange().authenticated()
            }
            .build()
    }
}
