package com.codev.onboardingdiary.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.codev.onboardingdiary.user.ProfileDetails;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserAccountService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RefreshTokenServiceIntegrationTest {

  @Autowired private RefreshTokenService refreshTokenService;
  @Autowired private RefreshTokenRepository repository;
  @Autowired private UserAccountService userAccountService;
  @Autowired private Clock clock;

  @Test
  void purgeExpiredDeletesOnlyExpiredTokens() {
    User user =
        userAccountService
            .createAccount(
                "purge-" + UUID.randomUUID() + "@example.com",
                "Password1",
                Set.of(Role.RECRUIT),
                new ProfileDetails("Purge Test", null, "QA", LocalDate.now()))
            .getUser();
    Instant now = clock.instant();
    String expiredHash = "expired-" + UUID.randomUUID();
    String revokedHash = "revoked-" + UUID.randomUUID();
    repository.save(
        new RefreshToken(
            user, expiredHash, now.minus(Duration.ofDays(8)), now.minus(Duration.ofDays(1))));
    RefreshToken revokedButValid =
        new RefreshToken(user, revokedHash, now, now.plus(Duration.ofDays(7)));
    revokedButValid.revoke();
    repository.save(revokedButValid);

    int deleted = refreshTokenService.purgeExpired();

    assertThat(deleted).isGreaterThanOrEqualTo(1);
    assertThat(repository.findByTokenHash(expiredHash)).isEmpty();
    assertThat(repository.findByTokenHash(revokedHash)).isPresent();
  }
}
