package com.onboardingdiary.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Aggregated, RBAC-scoped analytics for charting.
 */
public record AnalyticsResponse(
        LocalDate dateFrom,
        LocalDate dateTo,
        List<TaskCompletionPoint> taskCompletionTrend,
        Map<String, Long> issueSeverityDistribution,
        Map<String, Long> issueStatusDistribution,
        Map<String, Long> feedbackTypeDistribution,
        List<ActivityVolumePoint> activityVolumeTrend
) {

    /** One day on the task-completion trend line. */
    public record TaskCompletionPoint(
            LocalDate date,
            long total,
            long completed,
            double completionRate
    ) {
    }

    /** One day on the activity-volume trend, split by entity type. */
    public record ActivityVolumePoint(
            LocalDate date,
            long tasks,
            long issues,
            long feedback,
            long notes,
            long total
    ) {
    }
}
