package com.codev.onboardingdiary.common;

import java.util.List;
import org.springframework.http.HttpStatus;

/** Exception carrying the HTTP status and message to return to the client. */
public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final List<ApiError.FieldError> fieldErrors;

  private ApiException(HttpStatus status, String message, List<ApiError.FieldError> fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = List.copyOf(fieldErrors);
  }

  public static ApiException notFound(String message) {
    return new ApiException(HttpStatus.NOT_FOUND, message, List.of());
  }

  public static ApiException forbidden(String message) {
    return new ApiException(HttpStatus.FORBIDDEN, message, List.of());
  }

  public static ApiException conflict(String message) {
    return new ApiException(HttpStatus.CONFLICT, message, List.of());
  }

  public static ApiException unauthorized(String message) {
    return new ApiException(HttpStatus.UNAUTHORIZED, message, List.of());
  }

  public static ApiException badRequest(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, message, List.of());
  }

  public static ApiException fieldError(String field, String message) {
    return new ApiException(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        List.of(new ApiError.FieldError(field, message)));
  }

  public HttpStatus getStatus() {
    return status;
  }

  public List<ApiError.FieldError> getFieldErrors() {
    return fieldErrors;
  }
}
