package com.onboarding.diary.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long totalTasks;
    private long completedTasks;
    private long openIssues;
    private long feedbackCount;
    private long notesCount;
    private Map<String, Long> tasksByCategory;
    private Map<String, Long> tasksByStatus;
    private Map<String, Long> issuesBySeverity;
    private List<TaskResponse> recentTasks;
    private List<IssueResponse> recentIssues;
}
