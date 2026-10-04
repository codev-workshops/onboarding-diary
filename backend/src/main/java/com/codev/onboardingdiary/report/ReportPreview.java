package com.codev.onboardingdiary.report;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Row counts and the first rows of a report, with the same columns as the CSV file. */
public record ReportPreview(
    ReportType type,
    ReportScope scope,
    LocalDate from,
    LocalDate to,
    List<ReportSubject> subjects,
    Map<String, Long> counts,
    long totalRows,
    List<Column> columns,
    List<List<String>> rows) {

  public record Column(String key, String label) {}
}
