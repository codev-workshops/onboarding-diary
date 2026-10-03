package com.codev.onboardingdiary.common;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Translates exceptions into RFC 7807 problem details. */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ProblemDetail> handleApiException(ApiException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
    problem.setTitle(ex.getTitle());
    return ResponseEntity.status(ex.getStatus()).body(problem);
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  ResponseEntity<ProblemDetail> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT, "The record was modified by someone else. Reload and try again.");
    problem.setTitle("Conflict");
    return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ProblemDetail> handleUnexpected(Exception ex) {
    log.error("Unhandled exception", ex);
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
    problem.setTitle("Internal server error");
    return ResponseEntity.internalServerError().body(problem);
  }

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    List<Map<String, String>> errors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(
                error ->
                    Map.of(
                        "field",
                        error.getField(),
                        "message",
                        String.valueOf(error.getDefaultMessage())))
            .toList();
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "One or more fields are invalid");
    problem.setTitle("Validation failed");
    problem.setProperty("errors", errors);
    return ResponseEntity.badRequest().body(problem);
  }

  @Override
  protected ResponseEntity<Object> handleHttpMessageNotReadable(
      HttpMessageNotReadableException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    if (!(ex.getCause() instanceof InvalidFormatException invalid)) {
      return super.handleHttpMessageNotReadable(ex, headers, status, request);
    }
    String field =
        invalid.getPath().stream()
            .map(JsonMappingException.Reference::getFieldName)
            .filter(Objects::nonNull)
            .reduce((parent, child) -> parent + "." + child)
            .orElse("body");
    String message =
        invalid.getTargetType() == LocalDate.class
            ? "Must be a valid date (YYYY-MM-DD)"
            : "Has an invalid value";
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, field + ": " + message);
    problem.setTitle("Validation failed");
    problem.setProperty("errors", List.of(Map.of("field", field, "message", message)));
    return ResponseEntity.badRequest().body(problem);
  }
}
