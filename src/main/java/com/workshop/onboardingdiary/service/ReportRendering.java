package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.ReportResponse;
import java.util.Locale;

/** Wording and filename rules shared by the CSV and PDF renderers (REQUIREMENTS 4.7, US-R11). */
final class ReportRendering {

    static final String TITLE = "Onboarding Diary Report";
    static final String NO_ENTRIES = "No entries";
    static final String NO_ENTRIES_IN_RANGE = "No entries in the selected date range";

    private ReportRendering() {
    }

    /** Optional long text is rendered as an empty cell/line rather than a literal "null". */
    static String text(String value) {
        return value == null ? "" : value;
    }

    /**
     * Descriptive download filename carrying the recruit name and the date range, reduced to
     * characters that survive any filesystem and the {@code Content-Disposition} header.
     */
    static String filename(ReportResponse report, ReportFormat format) {
        String name = report.recruitName().trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
        name = name.replaceAll("(^-|-$)", "");
        if (name.isEmpty()) {
            name = "recruit";
        }
        return "onboarding-report-%s-%s-to-%s.%s"
                .formatted(name, report.dateFrom(), report.dateTo(), format.parameter());
    }
}
