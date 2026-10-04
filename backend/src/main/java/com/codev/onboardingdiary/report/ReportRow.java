package com.codev.onboardingdiary.report;

import java.time.Instant;
import java.time.LocalDate;

/**
 * One task, issue or feedback entry flattened for reporting. For feedback, {@code title} holds the
 * subject and {@code description} the details.
 */
public record ReportRow(
    RecordType recordType,
    Long id,
    Long ownerId,
    String recruitName,
    String recruitEmail,
    LocalDate date,
    String title,
    String description,
    String category,
    String status,
    String priority,
    String severity,
    String feedbackType,
    String resolutionNotes,
    Instant completedAt,
    Instant resolvedAt) {

  /** Kind of entry; declaration order is the order within a day in combined reports. */
  public enum RecordType {
    TASK,
    ISSUE,
    FEEDBACK
  }
}
