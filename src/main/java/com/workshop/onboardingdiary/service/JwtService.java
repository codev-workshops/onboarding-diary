package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.config.JwtProperties;
import com.workshop.onboardingdiary.entity.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Issues and validates the signed JWTs used for authentication (REQUIREMENTS section 7).
 */
@Service
public class JwtService {

    public static final String ROLE_CLAIM = "role";

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey signingKey;
    private final Duration expiry;

    public JwtService(JwtProperties properties) {
        this.signingKey = resolveKey(properties.getSecret());
        this.expiry = properties.getExpiry() == null ? Duration.ofHours(8) : properties.getExpiry();
    }

    public String issueToken(String email, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .claim(ROLE_CLAIM, role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiry)))
                .signWith(signingKey)
                .compact();
    }

    public Optional<Claims> parseToken(String token) {
        if (!StringUtils.hasText(token)) {
            return Optional.empty();
        }
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Rejected JWT: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<String> extractSubject(String token) {
        return parseToken(token).map(Claims::getSubject);
    }

    public Duration getExpiry() {
        return expiry;
    }

    private static SecretKey resolveKey(String secret) {
        if (StringUtils.hasText(secret) && secret.getBytes(StandardCharsets.UTF_8).length >= 32) {
            return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        }
        log.warn("onboarding-diary.jwt.secret is missing or shorter than 32 bytes; generating a random signing key. "
                + "Tokens will not survive a restart - set JWT_SECRET for a stable secret.");
        return Jwts.SIG.HS256.key().build();
    }
}
