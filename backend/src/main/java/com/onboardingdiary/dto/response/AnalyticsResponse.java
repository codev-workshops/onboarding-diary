package com.onboardingdiary.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class AnalyticsResponse {
    private Map<String, Long> tasksByStatus;
    private Map<String, Long> tasksByCategory;
    private Map<String, Long> tasksByPriority;
    private Map<String, Long> issuesBySeverity;
    private Map<String, Long> issuesByStatus;
    private Map<String, Long> feedbackByType;
    private List<WeeklyActivity> weeklyActivity;
    private double taskCompletionRate;
    private long totalEntries;

    @Getter
    @Builder
    public static class WeeklyActivity {
        private String week;
        private long tasks;
        private long issues;
        private long feedback;
        private long notes;
    }
}
