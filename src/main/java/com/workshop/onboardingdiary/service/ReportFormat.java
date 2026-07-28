package com.workshop.onboardingdiary.service;

import java.util.Arrays;
import java.util.Locale;

/** Download formats offered by {@code GET /api/reports} (REQUIREMENTS 4.7, 6.1). */
public enum ReportFormat {

    PDF("pdf", "application/pdf"),
    CSV("csv", "text/csv");

    private final String parameter;
    private final String contentType;

    ReportFormat(String parameter, String contentType) {
        this.parameter = parameter;
        this.contentType = contentType;
    }

    public String parameter() {
        return parameter;
    }

    public String contentType() {
        return contentType;
    }

    public static ReportFormat parse(String value) {
        if (value == null || value.isBlank()) {
            throw new FieldValidationException("format", "Format is required");
        }
        String normalised = value.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(format -> format.parameter.equals(normalised))
                .findFirst()
                .orElseThrow(() -> new FieldValidationException("format", "Format must be one of pdf, csv"));
    }
}
