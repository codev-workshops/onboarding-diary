package com.codev.onboardingdiary.common;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;

/** Factory for {@link ApiError} bodies. */
public final class ApiErrors {

  private ApiErrors() {}

  public static ApiError of(
      HttpStatus status,
      String message,
      List<ApiError.FieldError> fieldErrors,
      HttpServletRequest request) {
    return new ApiError(
        status.value(),
        status.getReasonPhrase(),
        message,
        fieldErrors,
        request.getRequestURI(),
        Instant.now());
  }

  public static ApiError of(HttpStatus status, String message, HttpServletRequest request) {
    return of(status, message, List.of(), request);
  }
}
