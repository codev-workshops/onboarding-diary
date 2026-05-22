package com.onboardingdiary.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DashboardResponse {
    private SummaryResponse summary;
    private List<TaskResponse> recentTasks;
    private List<IssueResponse> recentIssues;
    private List<FeedbackResponse> recentFeedback;
    private List<NoteResponse> recentNotes;
    private double taskCompletionRate;

    @Getter
    @Builder
    public static class SummaryResponse {
        private long totalTasks;
        private long completedTasks;
        private long openIssues;
        private long totalFeedback;
        private long totalNotes;
    }
}
