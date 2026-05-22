package com.onboardingdiary.service;

import com.onboardingdiary.dto.response.AnalyticsResponse;
import com.onboardingdiary.enums.TaskStatus;
import com.onboardingdiary.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private IssueRepository issueRepository;
    @Mock private FeedbackRepository feedbackRepository;
    @Mock private NoteRepository noteRepository;

    @InjectMocks private AnalyticsService analyticsService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void getAnalytics_returnsTaskBreakdowns() {
        when(taskRepository.countByUserGroupByStatus(userId))
                .thenReturn(List.of(
                        new Object[]{TaskStatus.COMPLETED, 5L},
                        new Object[]{TaskStatus.IN_PROGRESS, 3L}
                ));
        when(taskRepository.countByUserGroupByCategory(userId)).thenReturn(List.of());
        when(taskRepository.countByUserGroupByPriority(userId)).thenReturn(List.of());
        when(issueRepository.countByUserGroupBySeverity(userId)).thenReturn(List.of());
        when(issueRepository.countByUserGroupByStatus(userId)).thenReturn(List.of());
        when(feedbackRepository.countByUserGroupByType(userId)).thenReturn(List.of());
        when(taskRepository.countByUserId(userId)).thenReturn(8L);
        when(taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED)).thenReturn(5L);
        when(issueRepository.countByUserId(userId)).thenReturn(2L);
        when(feedbackRepository.countByUserId(userId)).thenReturn(1L);
        when(noteRepository.countByUserId(userId)).thenReturn(0L);
        when(taskRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());
        when(issueRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());
        when(feedbackRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());
        when(noteRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());

        AnalyticsResponse response = analyticsService.getAnalytics(userId);

        assertThat(response.getTasksByStatus()).containsEntry("COMPLETED", 5L);
        assertThat(response.getTasksByStatus()).containsEntry("IN_PROGRESS", 3L);
        assertThat(response.getTaskCompletionRate()).isEqualTo(62.5);
        assertThat(response.getTotalEntries()).isEqualTo(11);
    }

    @Test
    void getAnalytics_emptyData() {
        when(taskRepository.countByUserGroupByStatus(userId)).thenReturn(List.of());
        when(taskRepository.countByUserGroupByCategory(userId)).thenReturn(List.of());
        when(taskRepository.countByUserGroupByPriority(userId)).thenReturn(List.of());
        when(issueRepository.countByUserGroupBySeverity(userId)).thenReturn(List.of());
        when(issueRepository.countByUserGroupByStatus(userId)).thenReturn(List.of());
        when(feedbackRepository.countByUserGroupByType(userId)).thenReturn(List.of());
        when(taskRepository.countByUserId(userId)).thenReturn(0L);
        when(taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED)).thenReturn(0L);
        when(issueRepository.countByUserId(userId)).thenReturn(0L);
        when(feedbackRepository.countByUserId(userId)).thenReturn(0L);
        when(noteRepository.countByUserId(userId)).thenReturn(0L);
        when(taskRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());
        when(issueRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());
        when(feedbackRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());
        when(noteRepository.countWeeklyActivity(eq(userId), any(LocalDate.class))).thenReturn(List.of());

        AnalyticsResponse response = analyticsService.getAnalytics(userId);

        assertThat(response.getTasksByStatus()).isEmpty();
        assertThat(response.getTaskCompletionRate()).isEqualTo(0.0);
        assertThat(response.getTotalEntries()).isEqualTo(0);
        assertThat(response.getWeeklyActivity()).isEmpty();
    }

    @Test
    void getAnalytics_weeklyActivityMergesAllTypes() {
        when(taskRepository.countByUserGroupByStatus(userId)).thenReturn(List.of());
        when(taskRepository.countByUserGroupByCategory(userId)).thenReturn(List.of());
        when(taskRepository.countByUserGroupByPriority(userId)).thenReturn(List.of());
        when(issueRepository.countByUserGroupBySeverity(userId)).thenReturn(List.of());
        when(issueRepository.countByUserGroupByStatus(userId)).thenReturn(List.of());
        when(feedbackRepository.countByUserGroupByType(userId)).thenReturn(List.of());
        when(taskRepository.countByUserId(userId)).thenReturn(0L);
        when(taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED)).thenReturn(0L);
        when(issueRepository.countByUserId(userId)).thenReturn(0L);
        when(feedbackRepository.countByUserId(userId)).thenReturn(0L);
        when(noteRepository.countByUserId(userId)).thenReturn(0L);

        List<Object[]> taskWeekly = new ArrayList<>();
        taskWeekly.add(new Object[]{"2026-01-06", 3L});
        when(taskRepository.countWeeklyActivity(eq(userId), any(LocalDate.class)))
                .thenReturn(taskWeekly);
        List<Object[]> issueWeekly = new ArrayList<>();
        issueWeekly.add(new Object[]{"2026-01-06", 1L});
        when(issueRepository.countWeeklyActivity(eq(userId), any(LocalDate.class)))
                .thenReturn(issueWeekly);
        List<Object[]> feedbackWeekly = new ArrayList<>();
        feedbackWeekly.add(new Object[]{"2026-01-13", 2L});
        when(feedbackRepository.countWeeklyActivity(eq(userId), any(LocalDate.class)))
                .thenReturn(feedbackWeekly);
        when(noteRepository.countWeeklyActivity(eq(userId), any(LocalDate.class)))
                .thenReturn(List.of());

        AnalyticsResponse response = analyticsService.getAnalytics(userId);

        assertThat(response.getWeeklyActivity()).hasSize(2);
        assertThat(response.getWeeklyActivity().get(0).getWeek()).isEqualTo("2026-01-06");
        assertThat(response.getWeeklyActivity().get(0).getTasks()).isEqualTo(3);
        assertThat(response.getWeeklyActivity().get(0).getIssues()).isEqualTo(1);
        assertThat(response.getWeeklyActivity().get(1).getWeek()).isEqualTo("2026-01-13");
        assertThat(response.getWeeklyActivity().get(1).getFeedback()).isEqualTo(2);
    }
}
