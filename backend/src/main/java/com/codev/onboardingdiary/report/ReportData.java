package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.report.ReportRow.RecordType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Everything needed to render a report, loaded up front so rendering needs no database. */
public record ReportData(
    String organization,
    ReportType type,
    ReportScope scope,
    LocalDate from,
    LocalDate to,
    List<ReportSubject> subjects,
    List<ReportRow> rows,
    String generatedBy,
    Instant generatedAt) {

  /** True when rows come from more than one possible recruit (team or org-wide). */
  public boolean multiRecruit() {
    return scope != ReportScope.SELF;
  }

  public List<ReportRow> rowsOf(RecordType recordType) {
    return rows.stream().filter(row -> row.recordType() == recordType).toList();
  }

  public List<RecordType> sections() {
    return sections(type);
  }

  /** The categories a report type covers, in report order. */
  public static List<RecordType> sections(ReportType type) {
    return switch (type) {
      case TASKS -> List.of(RecordType.TASK);
      case ISSUES -> List.of(RecordType.ISSUE);
      case FEEDBACK -> List.of(RecordType.FEEDBACK);
      case COMBINED -> List.of(RecordType.TASK, RecordType.ISSUE, RecordType.FEEDBACK);
    };
  }
}
