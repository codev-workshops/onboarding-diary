package com.codev.onboardingdiary.team;

import com.codev.onboardingdiary.entry.issue.IssueSeverity;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Team-wide overview for a manager (assigned recruits) or admin (all recruits). */
public record TeamDashboardDto(
    int recruitCount,
    long openIssues,
    Map<IssueSeverity, Long> openBySeverity,
    List<RecruitProgress> recruits,
    List<Concern> recentConcerns) {

  /** Per-recruit progress; {@code percent} is null when the recruit has no tasks. */
  public record RecruitProgress(
      Long id,
      String name,
      long done,
      long total,
      Double percent,
      long openIssues,
      long criticalIssues) {}

  /** A recent feedback entry of type CONCERN. */
  public record Concern(
      Long id, Long recruitId, String recruitName, String subject, LocalDate entryDate) {}
}
