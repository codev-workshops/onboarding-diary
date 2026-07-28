package com.workshop.onboardingdiary.service;

import java.util.Map;

/** Business validation failure that maps to a 400 with a field-level message. */
public class FieldValidationException extends RuntimeException {

    private final transient Map<String, String> errors;

    public FieldValidationException(String field, String message) {
        super(message);
        this.errors = Map.of(field, message);
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
