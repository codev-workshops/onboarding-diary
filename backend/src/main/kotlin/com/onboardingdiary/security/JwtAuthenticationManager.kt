package com.onboardingdiary.security

import com.onboardingdiary.user.UserRepository
import com.onboardingdiary.user.UserStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.reactor.mono
import kotlinx.coroutines.withContext
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.ReactiveAuthenticationManager
import org.springframework.security.core.Authentication
import org.springframework.security.web.server.authentication.ServerAuthenticationConverter
import org.springframework.stereotype.Component
import org.springframework.web.server.ServerWebExchange
import reactor.core.publisher.Mono

/** Pulls `Authorization: Bearer <token>` off the request; absent header → no authentication attempt. */
@Component
class BearerTokenConverter : ServerAuthenticationConverter {
    override fun convert(exchange: ServerWebExchange): Mono<Authentication> {
        val header = exchange.request.headers.getFirst(HttpHeaders.AUTHORIZATION) ?: return Mono.empty()
        if (!header.startsWith(PREFIX, ignoreCase = true)) return Mono.empty()
        val token = header.substring(PREFIX.length).trim()
        if (token.isEmpty()) return Mono.empty()
        return Mono.just(BearerToken(token))
    }

    companion object {
        private const val PREFIX = "Bearer "
    }
}

/**
 * Verifies the JWT and loads the user by `sub` on every request; the stored
 * `role` and `status` are authoritative. Missing or non-ACTIVE users fail with
 * the same 401 as an invalid token.
 */
@Component
class JwtAuthenticationManager(
    private val jwtService: JwtService,
    private val userRepository: UserRepository,
) : ReactiveAuthenticationManager {

    override fun authenticate(authentication: Authentication): Mono<Authentication> = mono {
        val token = (authentication as? BearerToken)?.token ?: throw BadCredentialsException("unsupported")
        val claims = try {
            jwtService.verify(token)
        } catch (e: InvalidTokenException) {
            throw BadCredentialsException(e.message ?: "invalid token")
        }
        val user = withContext(Dispatchers.IO) { userRepository.findById(claims.userId) }
            ?: throw BadCredentialsException("unknown user")
        if (user.status != UserStatus.ACTIVE) throw BadCredentialsException("user not active")
        AuthenticatedUser(user) as Authentication
    }
}
