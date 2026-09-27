package com.onboardingdiary.security

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jose.crypto.MACVerifier
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.onboardingdiary.user.Role
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Instant
import java.util.Date
import java.util.UUID

data class IssuedToken(val token: String, val expiresAt: Instant)

data class JwtClaims(val userId: UUID, val email: String, val role: Role, val issuedAt: Instant, val expiresAt: Instant)

class InvalidTokenException(message: String) : RuntimeException(message)

/**
 * HS256 JWT issue / verify. Claims: `sub` (user id), `email`, `role`, `iat`,
 * `exp` (TTL 60 min by default). The `role` claim is informational only:
 * authorization always uses the role/status loaded from the DB per request.
 */
@Service
class JwtService(
    private val properties: JwtProperties,
    private val clock: Clock = Clock.systemUTC(),
) {
    private val secretBytes = properties.secret.toByteArray(Charsets.UTF_8).also {
        require(it.size >= 32) { "app.jwt.secret (APP_JWT_SECRET) must be at least 32 bytes for HS256" }
    }
    private val signer = MACSigner(secretBytes)
    private val verifier = MACVerifier(secretBytes)

    fun issue(userId: UUID, email: String, role: Role): IssuedToken {
        val now = clock.instant()
        val exp = now.plus(properties.ttl)
        val claims = JWTClaimsSet.Builder()
            .subject(userId.toString())
            .issuer(properties.issuer)
            .claim(CLAIM_EMAIL, email)
            .claim(CLAIM_ROLE, role.name)
            .issueTime(Date.from(now))
            .expirationTime(Date.from(exp))
            .build()
        val jwt = SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims)
        jwt.sign(signer)
        return IssuedToken(jwt.serialize(), exp)
    }

    fun verify(token: String): JwtClaims {
        val jwt = try {
            SignedJWT.parse(token)
        } catch (e: Exception) {
            throw InvalidTokenException("malformed token")
        }
        if (jwt.header.algorithm != JWSAlgorithm.HS256) throw InvalidTokenException("unsupported algorithm")
        if (!jwt.verify(verifier)) throw InvalidTokenException("bad signature")
        val claims = jwt.jwtClaimsSet
        val exp = claims.expirationTime?.toInstant() ?: throw InvalidTokenException("missing exp")
        if (!exp.isAfter(clock.instant())) throw InvalidTokenException("expired")
        val iat = claims.issueTime?.toInstant() ?: throw InvalidTokenException("missing iat")
        val sub = claims.subject ?: throw InvalidTokenException("missing sub")
        val userId = try {
            UUID.fromString(sub)
        } catch (e: IllegalArgumentException) {
            throw InvalidTokenException("bad sub")
        }
        val email = claims.getStringClaim(CLAIM_EMAIL) ?: throw InvalidTokenException("missing email")
        val role = try {
            Role.valueOf(claims.getStringClaim(CLAIM_ROLE) ?: throw InvalidTokenException("missing role"))
        } catch (e: IllegalArgumentException) {
            throw InvalidTokenException("bad role")
        }
        return JwtClaims(userId, email, role, iat, exp)
    }

    companion object {
        const val CLAIM_EMAIL = "email"
        const val CLAIM_ROLE = "role"
    }
}
