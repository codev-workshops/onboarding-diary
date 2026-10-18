package com.codev.onboardingdiary.dashboard;

import com.codev.onboardingdiary.entry.EntryType;
import com.codev.onboardingdiary.entry.issue.IssueSeverity;
import com.codev.onboardingdiary.entry.task.TaskStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Summary of one recruit's diary. */
public record DashboardDto(
    Counts counts, TaskProgress taskProgress, OpenIssues openIssues, List<RecentEntry> recent) {

  public record Counts(long tasks, long issues, long feedback, long notes) {}

  /** {@code percent} is null when there are no tasks, so clients never show 0% or NaN. */
  public record TaskProgress(
      long done, long total, Double percent, Map<TaskStatus, Long> byStatus) {}

  public record OpenIssues(
      long count, Map<IssueSeverity, Long> bySeverity, List<IssueSummary> top) {}

  public record IssueSummary(
      Long id, String title, IssueSeverity severity, LocalDate entryDate) {}

  public record RecentEntry(
      EntryType type, Long id, String title, LocalDate entryDate, Instant createdAt) {}
}
