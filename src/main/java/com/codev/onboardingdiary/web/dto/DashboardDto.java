package com.codev.onboardingdiary.web.dto;

import java.util.List;
import java.util.Map;

public record DashboardDto(long totalTasks,
                           long completedTasks,
                           int completionPercentage,
                           long openIssues,
                           long totalFeedback,
                           long totalNotes,
                           long overdueTasks,
                           Map<String, Long> tasksByStatus,
                           Map<String, Long> issuesBySeverity,
                           List<RecentEntryDto> recentEntries) {
}
