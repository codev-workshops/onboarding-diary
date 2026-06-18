package com.onboardingdiary.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Aggregated dashboard view, scoped to the records the caller may see.
 */
public record DashboardResponse(
        Summary summary,
        TaskMetrics taskMetrics,
        IssueMetrics issueMetrics,
        List<ActivityItem> recentActivity
) {

    /** Top-level counts shown on the summary cards. */
    public record Summary(
            long tasks,
            long issues,
            long feedback,
            long notes
    ) {
    }

    /** Task completion metrics, keyed by {@code TaskStatus} name. */
    public record TaskMetrics(
            long total,
            long completed,
            double completionRate,
            Map<String, Long> byStatus
    ) {
    }

    /** Open-issue metrics, keyed by {@code IssueStatus} / {@code IssueSeverity} name. */
    public record IssueMetrics(
            long total,
            long open,
            Map<String, Long> byStatus,
            Map<String, Long> bySeverity
    ) {
    }

    /** A single entry in the recent-activity feed. */
    public record ActivityItem(
            String type,
            long id,
            long ownerId,
            String title,
            LocalDate date,
            Instant occurredAt
    ) {
    }
}
