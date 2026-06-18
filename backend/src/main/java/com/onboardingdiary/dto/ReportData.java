package com.onboardingdiary.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Format-agnostic representation of a generated report. Renderers (CSV/PDF)
 * consume this structure.
 */
public record ReportData(
        String title,
        LocalDate dateFrom,
        LocalDate dateTo,
        Instant generatedAt,
        List<Section> sections
) {

    /** A single titled table within a report. */
    public record Section(
            String name,
            List<String> headers,
            List<List<String>> rows
    ) {
    }
}
