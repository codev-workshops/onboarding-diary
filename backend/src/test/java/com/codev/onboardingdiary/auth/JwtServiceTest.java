package com.codev.onboardingdiary.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.codev.onboardingdiary.config.AppProperties;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

  private static final Instant NOW = Instant.parse("2026-10-03T10:00:00Z");
  private static final String SECRET = "unit-test-secret-0123456789abcdef0123456789";

  @Test
  void createdTokenRoundTrips() {
    JwtService service = serviceAt(NOW, SECRET);

    AuthenticatedUser parsed = service.parse(service.createAccessToken(user())).orElseThrow();

    assertThat(parsed.id()).isEqualTo(42L);
    assertThat(parsed.email()).isEqualTo("a@example.com");
    assertThat(parsed.roles()).containsExactlyInAnyOrder(Role.RECRUIT, Role.MANAGER);
  }

  @Test
  void expiredTokenIsRejected() {
    String token = serviceAt(NOW, SECRET).createAccessToken(user());

    assertThat(serviceAt(NOW.plus(Duration.ofMinutes(16)), SECRET).parse(token)).isEmpty();
  }

  @Test
  void tokenSignedWithDifferentKeyIsRejected() {
    String token = serviceAt(NOW, SECRET).createAccessToken(user());

    assertThat(serviceAt(NOW, SECRET + "-other").parse(token)).isEmpty();
  }

  private static JwtService serviceAt(Instant instant, String secret) {
    AppProperties properties =
        new AppProperties(
            new AppProperties.Jwt(secret, Duration.ofMinutes(15), Duration.ofDays(7)),
            List.of(),
            List.of(),
            false,
            5,
            Duration.ofMinutes(15),
            false,
            null);
    return new JwtService(properties, Clock.fixed(instant, ZoneOffset.UTC));
  }

  private static User user() {
    User user = new User("a@example.com", "hash", Set.of(Role.RECRUIT, Role.MANAGER));
    ReflectionTestUtils.setField(user, "id", 42L);
    return user;
  }
}
