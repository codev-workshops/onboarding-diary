package com.codev.onboardingdiary.dashboard;

import java.time.Instant;
import java.time.LocalDate;

/**
 * One item of the recent-activity timeline. {@code status} holds the task or issue status, the
 * feedback type, or null for notes.
 */
public record RecentEntry(
    EntryType type, Long id, LocalDate entryDate, String title, String status, Instant updatedAt) {

  /** Diary log an entry belongs to. */
  public enum EntryType {
    TASK,
    ISSUE,
    FEEDBACK,
    NOTE
  }
}
