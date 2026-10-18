package com.codev.onboardingdiary.report;

import java.time.LocalDate;
import java.util.List;

/** Format-independent report content: one header row plus data rows of equal width. */
public record ReportTable(
    String title,
    String recruitName,
    LocalDate from,
    LocalDate to,
    List<String> headers,
    List<List<String>> rows) {}
