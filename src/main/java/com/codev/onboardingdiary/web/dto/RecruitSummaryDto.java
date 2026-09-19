package com.codev.onboardingdiary.web.dto;

public record RecruitSummaryDto(Long id,
                                String name,
                                String email,
                                String department,
                                long totalTasks,
                                long completedTasks,
                                int completionPercentage,
                                long openIssues,
                                String lastActivity) {
}
