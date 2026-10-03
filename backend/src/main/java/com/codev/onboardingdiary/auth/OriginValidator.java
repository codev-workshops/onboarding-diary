package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.config.AppProperties;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * CSRF defence for the cookie-authenticated endpoints: when a browser sends an {@code Origin}
 * header it must be one of the configured CORS origins.
 */
@Component
public class OriginValidator {

  private final List<String> allowedOrigins;

  public OriginValidator(AppProperties properties) {
    this.allowedOrigins = properties.corsOrigins();
  }

  public void requireAllowed(String origin) {
    if (origin != null && !allowedOrigins.contains(origin)) {
      throw ApiException.forbidden("Origin not allowed");
    }
  }
}
