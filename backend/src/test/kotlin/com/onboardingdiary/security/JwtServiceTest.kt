package com.onboardingdiary.security

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.PlainJWT
import com.nimbusds.jwt.SignedJWT
import com.onboardingdiary.user.Role
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import java.util.Date
import java.util.UUID

class JwtServiceTest {

    private val secret = "unit-test-jwt-secret-0123456789abcdef-0123456789"
    private val now = Instant.parse("2026-01-01T12:00:00Z")
    private val clock = Clock.fixed(now, ZoneOffset.UTC)
    private val props = JwtProperties(secret = secret)
    private val service = JwtService(props, clock)
    private val userId = UUID.randomUUID()

    @Test
    fun `issues HS256 token with sub email role iat exp and 60 minute ttl`() {
        val issued = service.issue(userId, "jane@example.com", Role.MANAGER)
        val jwt = SignedJWT.parse(issued.token)

        assertEquals(JWSAlgorithm.HS256, jwt.header.algorithm)
        assertEquals(userId.toString(), jwt.jwtClaimsSet.subject)
        assertEquals("jane@example.com", jwt.jwtClaimsSet.getStringClaim("email"))
        assertEquals("MANAGER", jwt.jwtClaimsSet.getStringClaim("role"))
        assertEquals(Date.from(now), jwt.jwtClaimsSet.issueTime)
        assertEquals(Date.from(now.plus(Duration.ofMinutes(60))), jwt.jwtClaimsSet.expirationTime)
        assertEquals(now.plus(Duration.ofMinutes(60)), issued.expiresAt)
    }

    @Test
    fun `verify round-trips the claims`() {
        val issued = service.issue(userId, "jane@example.com", Role.ADMIN)
        val claims = service.verify(issued.token)
        assertEquals(JwtClaims(userId, "jane@example.com", Role.ADMIN, now, now.plus(Duration.ofMinutes(60))), claims)
    }

    @Test
    fun `rejects expired token`() {
        val issued = service.issue(userId, "jane@example.com", Role.NEW_RECRUIT)
        val later = JwtService(props, Clock.fixed(now.plus(Duration.ofMinutes(61)), ZoneOffset.UTC))
        assertThrows(InvalidTokenException::class.java) { later.verify(issued.token) }
    }

    @Test
    fun `rejects token signed with another secret`() {
        val other = JwtService(JwtProperties(secret = "another-secret-0123456789abcdef-0123456789"), clock)
        val issued = other.issue(userId, "jane@example.com", Role.NEW_RECRUIT)
        assertThrows(InvalidTokenException::class.java) { service.verify(issued.token) }
    }

    @Test
    fun `rejects malformed and tampered tokens`() {
        assertThrows(InvalidTokenException::class.java) { service.verify("not-a-jwt") }
        assertThrows(InvalidTokenException::class.java) { service.verify("") }
        val issued = service.issue(userId, "jane@example.com", Role.NEW_RECRUIT)
        val parts = issued.token.split(".")
        val tampered = parts[0] + "." + parts[1].dropLast(2) + "xx." + parts[2]
        assertThrows(InvalidTokenException::class.java) { service.verify(tampered) }
    }

    @Test
    fun `rejects unsigned and non-HS256 tokens`() {
        val claims = JWTClaimsSet.Builder().subject(userId.toString())
            .claim("email", "jane@example.com").claim("role", "ADMIN")
            .issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(600))).build()

        assertThrows(InvalidTokenException::class.java) { service.verify(PlainJWT(claims).serialize()) }

        val rsa = RSAKeyGenerator(2048).generate()
        val rs256 = SignedJWT(JWSHeader(JWSAlgorithm.RS256), claims).also { it.sign(RSASSASigner(rsa)) }
        assertThrows(InvalidTokenException::class.java) { service.verify(rs256.serialize()) }

        val hs512 = SignedJWT(JWSHeader(JWSAlgorithm.HS512), claims).also { it.sign(MACSigner((secret + secret).toByteArray())) }
        assertThrows(InvalidTokenException::class.java) { service.verify(hs512.serialize()) }
    }

    @Test
    fun `rejects tokens missing required claims or with a non-uuid subject`() {
        val signer = MACSigner(secret.toByteArray())
        fun signed(builder: JWTClaimsSet.Builder) =
            SignedJWT(JWSHeader(JWSAlgorithm.HS256), builder.build()).also { it.sign(signer) }.serialize()
        val base = JWTClaimsSet.Builder().subject(userId.toString())
            .claim("email", "jane@example.com").claim("role", "ADMIN")
            .issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(600)))

        assertThrows(InvalidTokenException::class.java) { service.verify(signed(base.subject("nope"))) }
        assertThrows(InvalidTokenException::class.java) { service.verify(signed(base.subject(userId.toString()).claim("role", "GOD"))) }
        assertThrows(InvalidTokenException::class.java) { service.verify(signed(base.claim("role", "ADMIN").expirationTime(null))) }
    }

    @Test
    fun `refuses a secret shorter than 256 bits`() {
        assertThrows(IllegalArgumentException::class.java) { JwtService(JwtProperties(secret = "too-short"), clock) }
    }
}
