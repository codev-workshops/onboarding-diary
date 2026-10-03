package com.codev.onboardingdiary.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Application settings bound from the {@code app.*} namespace. */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
    @Valid @NotNull Jwt jwt,
    List<String> corsOrigins,
    List<String> allowedEmailDomains,
    boolean refreshCookieSecure,
    @Min(1) int maxFailedLogins,
    @NotNull Duration lockoutDuration,
    boolean seedDemoData,
    Admin admin) {

  public AppProperties {
    corsOrigins = corsOrigins == null ? List.of() : List.copyOf(corsOrigins);
    allowedEmailDomains =
        allowedEmailDomains == null
            ? List.of()
            : allowedEmailDomains.stream()
                .map(String::trim)
                .filter(domain -> !domain.isEmpty())
                .map(String::toLowerCase)
                .toList();
    admin = admin == null ? new Admin(null, null) : admin;
  }

  /** JWT signing and token lifetime settings. */
  public record Jwt(
      @NotNull @Size(min = 32, message = "app.jwt.secret must be at least 32 characters (256 bits)")
          String secret,
      @NotNull Duration accessTokenTtl,
      @NotNull Duration refreshTokenTtl) {}

  /** Bootstrap administrator created on first startup. */
  public record Admin(String email, String password) {}
}
