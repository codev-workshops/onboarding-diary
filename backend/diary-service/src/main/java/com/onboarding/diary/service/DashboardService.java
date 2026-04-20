package com.onboarding.diary.service;

import com.onboarding.diary.dto.DashboardResponse;
import com.onboarding.diary.dto.IssueResponse;
import com.onboarding.diary.dto.TaskResponse;
import com.onboarding.diary.entity.IssueStatus;
import com.onboarding.diary.entity.Severity;
import com.onboarding.diary.entity.TaskCategory;
import com.onboarding.diary.entity.TaskStatus;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TaskService taskService;
    private final IssueService issueService;
    private final FeedbackService feedbackService;
    private final NoteService noteService;

    public DashboardResponse getDashboard(String userId) {
        long totalTasks = taskService.countByUserId(userId);
        long completedTasks = taskService.countByUserIdAndStatus(userId, TaskStatus.COMPLETED);
        long openIssues = issueService.countByUserIdAndStatus(userId, IssueStatus.OPEN);
        long feedbackCount = feedbackService.countByUserId(userId);
        long notesCount = noteService.countByUserId(userId);

        Map<String, Long> tasksByCategory = new LinkedHashMap<>();
        for (TaskCategory category : TaskCategory.values()) {
            tasksByCategory.put(category.name(), taskService.countByUserIdAndCategory(userId, category));
        }

        Map<String, Long> tasksByStatus = new LinkedHashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            tasksByStatus.put(status.name(), taskService.countByUserIdAndStatus(userId, status));
        }

        Map<String, Long> issuesBySeverity = new LinkedHashMap<>();
        for (Severity severity : Severity.values()) {
            issuesBySeverity.put(severity.name(), issueService.countByUserIdAndSeverity(userId, severity));
        }

        List<TaskResponse> recentTasks = taskService.getRecentTasks(userId, 5);
        List<IssueResponse> recentIssues = issueService.getRecentIssues(userId, 5);

        return DashboardResponse.builder()
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .openIssues(openIssues)
                .feedbackCount(feedbackCount)
                .notesCount(notesCount)
                .tasksByCategory(tasksByCategory)
                .tasksByStatus(tasksByStatus)
                .issuesBySeverity(issuesBySeverity)
                .recentTasks(recentTasks)
                .recentIssues(recentIssues)
                .build();
    }

    public DashboardResponse getManagerDashboard(List<String> recruitIds) {
        long totalTasks = 0;
        long completedTasks = 0;
        long openIssues = 0;
        long feedbackCount = 0;
        long notesCount = 0;

        Map<String, Long> tasksByCategory = new LinkedHashMap<>();
        for (TaskCategory category : TaskCategory.values()) {
            tasksByCategory.put(category.name(), 0L);
        }
        Map<String, Long> tasksByStatus = new LinkedHashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            tasksByStatus.put(status.name(), 0L);
        }
        Map<String, Long> issuesBySeverity = new LinkedHashMap<>();
        for (Severity severity : Severity.values()) {
            issuesBySeverity.put(severity.name(), 0L);
        }

        for (String recruitId : recruitIds) {
            totalTasks += taskService.countByUserId(recruitId);
            completedTasks += taskService.countByUserIdAndStatus(recruitId, TaskStatus.COMPLETED);
            openIssues += issueService.countByUserIdAndStatus(recruitId, IssueStatus.OPEN);
            feedbackCount += feedbackService.countByUserId(recruitId);
            notesCount += noteService.countByUserId(recruitId);

            for (TaskCategory category : TaskCategory.values()) {
                tasksByCategory.merge(category.name(),
                        taskService.countByUserIdAndCategory(recruitId, category), Long::sum);
            }
            for (TaskStatus status : TaskStatus.values()) {
                tasksByStatus.merge(status.name(),
                        taskService.countByUserIdAndStatus(recruitId, status), Long::sum);
            }
            for (Severity severity : Severity.values()) {
                issuesBySeverity.merge(severity.name(),
                        issueService.countByUserIdAndSeverity(recruitId, severity), Long::sum);
            }
        }

        return DashboardResponse.builder()
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .openIssues(openIssues)
                .feedbackCount(feedbackCount)
                .notesCount(notesCount)
                .tasksByCategory(tasksByCategory)
                .tasksByStatus(tasksByStatus)
                .issuesBySeverity(issuesBySeverity)
                .recentTasks(List.of())
                .recentIssues(List.of())
                .build();
    }

    public DashboardResponse getAdminDashboard() {
        return DashboardResponse.builder()
                .totalTasks(0)
                .completedTasks(0)
                .openIssues(0)
                .feedbackCount(0)
                .notesCount(0)
                .tasksByCategory(new LinkedHashMap<>())
                .tasksByStatus(new LinkedHashMap<>())
                .issuesBySeverity(new LinkedHashMap<>())
                .recentTasks(List.of())
                .recentIssues(List.of())
                .build();
    }
}
