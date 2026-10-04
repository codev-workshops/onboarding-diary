package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.report.ReportRow.RecordType;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/** A report column: CSV header key, human label, relative PDF width and value extractor. */
public record ReportColumn(
    String key, String label, float width, Function<ReportRow, String> value) {

  private static final ReportColumn RECRUIT_NAME =
      new ReportColumn("recruitName", "Recruit", 2.5f, ReportRow::recruitName);
  private static final ReportColumn RECRUIT_EMAIL =
      new ReportColumn("recruitEmail", "Recruit email", 3f, ReportRow::recruitEmail);
  private static final ReportColumn DATE =
      new ReportColumn("date", "Date", 1.6f, row -> row.date().toString());
  private static final ReportColumn TITLE =
      new ReportColumn("title", "Title", 3f, ReportRow::title);
  private static final ReportColumn DESCRIPTION =
      new ReportColumn("description", "Description", 4f, ReportRow::description);
  private static final ReportColumn CATEGORY =
      new ReportColumn("category", "Category", 1.8f, ReportRow::category);
  private static final ReportColumn STATUS =
      new ReportColumn("status", "Status", 1.6f, ReportRow::status);
  private static final ReportColumn PRIORITY =
      new ReportColumn("priority", "Priority", 1.3f, ReportRow::priority);
  private static final ReportColumn SEVERITY =
      new ReportColumn("severity", "Severity", 1.3f, ReportRow::severity);
  private static final ReportColumn RESOLUTION =
      new ReportColumn("resolutionNotes", "Resolution notes", 3f, ReportRow::resolutionNotes);

  /** Columns for a CSV file or preview of the given report type. */
  public static List<ReportColumn> forType(ReportType type, boolean multiRecruit) {
    List<ReportColumn> columns = new ArrayList<>();
    if (multiRecruit) {
      columns.add(RECRUIT_NAME);
      columns.add(RECRUIT_EMAIL);
    }
    columns.addAll(
        switch (type) {
          case TASKS -> forRecord(RecordType.TASK);
          case ISSUES -> forRecord(RecordType.ISSUE);
          case FEEDBACK -> forRecord(RecordType.FEEDBACK);
          case COMBINED ->
              List.of(
                  DATE,
                  new ReportColumn("recordType", "Type", 1.3f, row -> row.recordType().name()),
                  TITLE,
                  DESCRIPTION,
                  CATEGORY,
                  STATUS,
                  PRIORITY,
                  SEVERITY,
                  new ReportColumn("type", "Feedback type", 1.6f, ReportRow::feedbackType),
                  RESOLUTION);
        });
    return columns;
  }

  /** Columns for one kind of entry, as used by single-type reports and PDF sections. */
  public static List<ReportColumn> forRecord(RecordType recordType) {
    return switch (recordType) {
      case TASK ->
          List.of(
              DATE,
              TITLE,
              DESCRIPTION,
              CATEGORY,
              STATUS,
              PRIORITY,
              new ReportColumn("completedAt", "Completed at", 2.2f, r -> text(r.completedAt())));
      case ISSUE ->
          List.of(
              DATE,
              TITLE,
              DESCRIPTION,
              SEVERITY,
              STATUS,
              RESOLUTION,
              new ReportColumn("resolvedAt", "Resolved at", 2.2f, r -> text(r.resolvedAt())));
      case FEEDBACK ->
          List.of(
              DATE,
              new ReportColumn("subject", "Subject", 3f, ReportRow::title),
              new ReportColumn("type", "Type", 1.6f, ReportRow::feedbackType),
              new ReportColumn("details", "Details", 5f, ReportRow::description));
    };
  }

  /** Same as {@link #forRecord} with a leading recruit column for multi-recruit PDFs. */
  public static List<ReportColumn> forPdfSection(RecordType recordType, boolean multiRecruit) {
    List<ReportColumn> columns = new ArrayList<>();
    if (multiRecruit) {
      columns.add(RECRUIT_NAME);
    }
    columns.addAll(forRecord(recordType));
    return columns;
  }

  private static String text(Instant instant) {
    return instant == null ? null : instant.toString();
  }
}
