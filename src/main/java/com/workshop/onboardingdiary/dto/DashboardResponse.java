package com.workshop.onboardingdiary.dto;

import java.util.List;

/** Dashboard summary for one user (REQUIREMENTS 4.6, US-R10, US-M03, decision D7). */
public record DashboardResponse(Long userId, DashboardCounts counts, TaskCompletion taskCompletion,
                                List<IssueResponse> openIssues, List<RecentEntryResponse> recentEntries) {

    /** Entry counts per entry type. */
    public record DashboardCounts(long tasks, long issues, long feedbackNotes, long additionalNotes) {
    }

    /** Completed tasks over all tasks, with the share rounded to a whole percent (0% when empty). */
    public record TaskCompletion(long completedTasks, long totalTasks, int percentComplete) {

        public static TaskCompletion of(long completedTasks, long totalTasks) {
            int percent = totalTasks == 0 ? 0 : (int) Math.round(completedTasks * 100.0 / totalTasks);
            return new TaskCompletion(completedTasks, totalTasks, percent);
        }
    }
}
