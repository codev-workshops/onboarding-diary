package com.codev.onboardingdiary.common;

import java.time.Instant;
import java.util.List;

/** Uniform error body returned by every failing API call. */
public record ApiError(
    int status,
    String error,
    String message,
    List<FieldError> fieldErrors,
    String path,
    Instant timestamp) {

  /** A validation problem tied to a single request field. */
  public record FieldError(String field, String message) {}
}
