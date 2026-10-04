package com.codev.onboardingdiary.manager;

import com.codev.onboardingdiary.dashboard.DashboardSummary.WeeklyCount;
import com.codev.onboardingdiary.issue.IssueResponse;
import java.util.List;

/**
 * Team dashboard: aggregate figures, tasks completed per week across the team, every recruit's
 * progress and urgent open issues.
 */
public record TeamSummary(
    int recruitCount,
    double averageCompletionPct,
    long openIssues,
    long atRiskCount,
    List<WeeklyCount> weeklyCompletedTrend,
    List<RecruitSummary> recruits,
    List<TeamIssue> highSeverityIssues) {

  /** An open HIGH or CRITICAL issue together with the recruit who logged it. */
  public record TeamIssue(Long recruitId, String recruitName, IssueResponse issue) {}
}
