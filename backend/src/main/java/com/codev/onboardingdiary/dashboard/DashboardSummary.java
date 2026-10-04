package com.codev.onboardingdiary.dashboard;

import com.codev.onboardingdiary.feedback.FeedbackType;
import com.codev.onboardingdiary.issue.IssueResponse;
import com.codev.onboardingdiary.issue.IssueSeverity;
import com.codev.onboardingdiary.task.TaskStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Aggregated counts for one user's diary, shown on the dashboard. */
public record DashboardSummary(
    LocalDate startDate,
    long daysSinceStart,
    TaskStats tasks,
    IssueStats issues,
    FeedbackStats feedback,
    NoteStats notes,
    List<WeeklyCount> weeklyCompletedTrend,
    List<IssueResponse> topOpenIssues) {

  /** Task totals per status and the share of completed tasks (0-100, one decimal). */
  public record TaskStats(long total, Map<TaskStatus, Long> byStatus, double completionPct) {}

  /** Open (OPEN or IN_PROGRESS) issues, in total and per severity. */
  public record IssueStats(long open, Map<IssueSeverity, Long> openBySeverity) {}

  /** Feedback totals per type. */
  public record FeedbackStats(long total, Map<FeedbackType, Long> byType) {}

  /** Number of notes visible to the viewer. */
  public record NoteStats(long total) {}

  /** Tasks completed in the ISO week starting on {@code weekStart} (a Monday). */
  public record WeeklyCount(LocalDate weekStart, long completed) {}
}
