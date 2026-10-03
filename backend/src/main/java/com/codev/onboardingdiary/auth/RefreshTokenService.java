package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.config.AppProperties;
import com.codev.onboardingdiary.user.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issues, rotates and revokes opaque refresh tokens. Only SHA-256 hashes are stored. */
@Service
public class RefreshTokenService {

  private static final int TOKEN_BYTES = 32;
  private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

  private final RefreshTokenRepository repository;
  private final Duration ttl;
  private final Clock clock;
  private final SecureRandom secureRandom = new SecureRandom();

  public RefreshTokenService(
      RefreshTokenRepository repository, AppProperties properties, Clock clock) {
    this.repository = repository;
    this.ttl = properties.jwt().refreshTokenTtl();
    this.clock = clock;
  }

  public Duration ttl() {
    return ttl;
  }

  @Transactional
  public String issue(User user) {
    byte[] bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);
    String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    Instant now = clock.instant();
    repository.save(new RefreshToken(user, hash(rawToken), now, now.plus(ttl)));
    return rawToken;
  }

  /**
   * Consumes a refresh token and returns its owner. A reused (already revoked) token revokes every
   * token of that user, since it indicates the token was stolen.
   */
  @Transactional(noRollbackFor = ApiException.class)
  public User consume(String rawToken) {
    RefreshToken token =
        repository
            .findByTokenHash(hash(rawToken))
            .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));
    if (token.isRevoked()) {
      repository.revokeAllForUser(token.getUser().getId());
      throw ApiException.unauthorized("Invalid refresh token");
    }
    token.revoke();
    if (token.isExpiredAt(clock.instant()) || !token.getUser().isEnabled()) {
      throw ApiException.unauthorized("Invalid refresh token");
    }
    return token.getUser();
  }

  @Transactional
  public void revoke(String rawToken) {
    repository.findByTokenHash(hash(rawToken)).ifPresent(RefreshToken::revoke);
  }

  @Transactional
  public void revokeAll(User user) {
    repository.revokeAllForUser(user.getId());
  }

  /** Deletes expired tokens; revoked but unexpired tokens are kept so reuse is still detected. */
  @Scheduled(cron = "${app.refresh-token-cleanup-cron:0 0 3 * * *}", zone = "UTC")
  @Transactional
  public int purgeExpired() {
    int deleted = repository.deleteExpiredBefore(clock.instant());
    if (deleted > 0) {
      log.info("Purged {} expired refresh tokens", deleted);
    }
    return deleted;
  }

  private static String hash(String rawToken) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 not available", ex);
    }
  }
}
