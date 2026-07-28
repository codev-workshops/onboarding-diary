package com.workshop.onboardingdiary.dto;

import java.util.Map;

/** Error body: a human-readable message plus per-field messages for form display. */
public record ApiErrorResponse(int status, String message, Map<String, String> errors) {

    public static ApiErrorResponse of(int status, String message) {
        return new ApiErrorResponse(status, message, Map.of());
    }
}
