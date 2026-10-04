package com.codev.onboardingdiary.common;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** Business exception that maps directly to an HTTP status and problem detail. */
public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final String title;
  private final List<Map<String, String>> fieldErrors;

  public ApiException(HttpStatus status, String title, String detail) {
    this(status, title, detail, List.of());
  }

  private ApiException(
      HttpStatus status, String title, String detail, List<Map<String, String>> fieldErrors) {
    super(detail);
    this.status = status;
    this.title = title;
    this.fieldErrors = fieldErrors;
  }

  /** A 400 tied to one request field, rendered like bean-validation errors. */
  public static ApiException invalidField(String field, String message) {
    return new ApiException(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        field + ": " + message,
        List.of(Map.of("field", field, "message", message)));
  }

  public static ApiException badRequest(String detail) {
    return new ApiException(HttpStatus.BAD_REQUEST, "Bad request", detail);
  }

  public static ApiException unauthorized(String detail) {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized", detail);
  }

  public static ApiException forbidden(String detail) {
    return new ApiException(HttpStatus.FORBIDDEN, "Forbidden", detail);
  }

  public static ApiException notFound(String detail) {
    return new ApiException(HttpStatus.NOT_FOUND, "Not found", detail);
  }

  public static ApiException conflict(String detail) {
    return new ApiException(HttpStatus.CONFLICT, "Conflict", detail);
  }

  public static ApiException locked(String detail) {
    return new ApiException(HttpStatus.LOCKED, "Account locked", detail);
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getTitle() {
    return title;
  }

  public List<Map<String, String>> getFieldErrors() {
    return fieldErrors;
  }
}
