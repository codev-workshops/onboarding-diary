package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.config.AppProperties;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Builds the HttpOnly cookie that carries the refresh token. */
@Component
public class RefreshCookieFactory {

  public static final String COOKIE_NAME = "refresh_token";
  private static final String COOKIE_PATH = "/api/auth";

  private final boolean secure;
  private final Duration maxAge;

  public RefreshCookieFactory(AppProperties properties) {
    this.secure = properties.refreshCookieSecure();
    this.maxAge = properties.jwt().refreshTokenTtl();
  }

  public ResponseCookie create(String refreshToken) {
    return build(refreshToken, maxAge);
  }

  public ResponseCookie clear() {
    return build("", Duration.ZERO);
  }

  private ResponseCookie build(String value, Duration age) {
    return ResponseCookie.from(COOKIE_NAME, value)
        .httpOnly(true)
        .secure(secure)
        .sameSite("Strict")
        .path(COOKIE_PATH)
        .maxAge(age)
        .build();
  }
}
