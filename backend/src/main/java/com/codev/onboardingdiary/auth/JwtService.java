package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.config.AppProperties;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** Issues and validates short-lived HS256 access tokens. */
@Service
public class JwtService {

  private static final String CLAIM_EMAIL = "email";
  private static final String CLAIM_ROLES = "roles";

  private final SecretKey signingKey;
  private final AppProperties.Jwt settings;
  private final Clock clock;

  public JwtService(AppProperties properties, Clock clock) {
    this.settings = properties.jwt();
    this.signingKey = Keys.hmacShaKeyFor(settings.secret().getBytes(StandardCharsets.UTF_8));
    this.clock = clock;
  }

  public String createAccessToken(User user) {
    Instant now = clock.instant();
    return Jwts.builder()
        .subject(String.valueOf(user.getId()))
        .claim(CLAIM_EMAIL, user.getEmail())
        .claim(CLAIM_ROLES, user.getRoles().stream().map(Role::name).sorted().toList())
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(settings.accessTokenTtl())))
        .signWith(signingKey)
        .compact();
  }

  public long accessTokenTtlSeconds() {
    return settings.accessTokenTtl().toSeconds();
  }

  /** Returns the authenticated user if the token is valid and unexpired. */
  public Optional<AuthenticatedUser> parse(String token) {
    try {
      Claims claims =
          Jwts.parser()
              .verifyWith(signingKey)
              .clock(() -> Date.from(clock.instant()))
              .build()
              .parseSignedClaims(token)
              .getPayload();
      return Optional.of(
          new AuthenticatedUser(
              Long.valueOf(claims.getSubject()),
              claims.get(CLAIM_EMAIL, String.class),
              toRoles(claims.get(CLAIM_ROLES, Collection.class))));
    } catch (JwtException | IllegalArgumentException ex) {
      return Optional.empty();
    }
  }

  private static Set<Role> toRoles(Collection<?> rawRoles) {
    if (rawRoles == null || rawRoles.isEmpty()) {
      return EnumSet.noneOf(Role.class);
    }
    return rawRoles.stream()
        .map(Object::toString)
        .map(Role::valueOf)
        .collect(Collectors.toCollection(() -> EnumSet.noneOf(Role.class)));
  }
}
