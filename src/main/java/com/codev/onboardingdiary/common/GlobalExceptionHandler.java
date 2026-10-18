package com.codev.onboardingdiary.common;

import com.fasterxml.jackson.databind.JsonMappingException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Translates exceptions into {@link ApiError} responses. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
    return respond(ex.getStatus(), ex.getMessage(), ex.getFieldErrors(), request);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleInvalid(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    List<ApiError.FieldError> fieldErrors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new ApiError.FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
    return respond(HttpStatus.BAD_REQUEST, "Validation failed", fieldErrors, request);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<ApiError> handleUnreadable(
      HttpMessageNotReadableException ex, HttpServletRequest request) {
    if (ex.getCause() instanceof JsonMappingException mappingException
        && !mappingException.getPath().isEmpty()) {
      String field =
          mappingException.getPath().stream()
              .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
              .collect(Collectors.joining("."));
      return respond(
          HttpStatus.BAD_REQUEST,
          "Validation failed",
          List.of(new ApiError.FieldError(field, "has an invalid value")),
          request);
    }
    return respond(HttpStatus.BAD_REQUEST, "Malformed request body", List.of(), request);
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  ResponseEntity<ApiError> handleTypeMismatch(
      MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
    return respond(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        List.of(new ApiError.FieldError(ex.getName(), "has an invalid value")),
        request);
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  ResponseEntity<ApiError> handleMissingParam(
      MissingServletRequestParameterException ex, HttpServletRequest request) {
    return respond(
        HttpStatus.BAD_REQUEST,
        "Validation failed",
        List.of(new ApiError.FieldError(ex.getParameterName(), "is required")),
        request);
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleAccessDenied(
      AccessDeniedException ex, HttpServletRequest request) {
    return respond(HttpStatus.FORBIDDEN, "Access denied", List.of(), request);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  ResponseEntity<ApiError> handleMethod(
      HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
    return respond(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage(), List.of(), request);
  }

  @ExceptionHandler(NoResourceFoundException.class)
  ResponseEntity<ApiError> handleNoResource(
      NoResourceFoundException ex, HttpServletRequest request) {
    return respond(HttpStatus.NOT_FOUND, "Not found", List.of(), request);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
    log.error("Unexpected error on {}", request.getRequestURI(), ex);
    return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", List.of(), request);
  }

  private static ResponseEntity<ApiError> respond(
      HttpStatus status,
      String message,
      List<ApiError.FieldError> fieldErrors,
      HttpServletRequest request) {
    return ResponseEntity.status(status)
        .body(ApiErrors.of(status, message, fieldErrors, request));
  }
}
