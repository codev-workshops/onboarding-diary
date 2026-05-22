package com.onboardingdiary.service;

import com.onboardingdiary.dto.response.DashboardResponse;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.*;
import com.onboardingdiary.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private IssueRepository issueRepository;

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private NoteRepository noteRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .email("test@test.com")
                .role(Role.RECRUIT)
                .build();
    }

    @Test
    void getDashboard_returnsSummaryWithCounts() {
        when(taskRepository.countByUserId(userId)).thenReturn(5L);
        when(taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED)).thenReturn(3L);
        when(issueRepository.countByUserIdAndStatusIn(eq(userId), anyList())).thenReturn(2L);
        when(feedbackRepository.countByUserId(userId)).thenReturn(4L);
        when(noteRepository.countByUserId(userId)).thenReturn(1L);

        Task task = Task.builder()
                .id(UUID.randomUUID())
                .user(user)
                .date(LocalDate.now())
                .title("Task")
                .category(TaskCategory.SETUP)
                .status(TaskStatus.COMPLETED)
                .priority(TaskPriority.HIGH)
                .build();

        when(taskRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(task)));
        when(issueRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(feedbackRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(noteRepository.findByUserWithFilters(eq(userId), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardResponse response = dashboardService.getDashboard(userId);

        assertNotNull(response);
        assertEquals(5L, response.getSummary().getTotalTasks());
        assertEquals(3L, response.getSummary().getCompletedTasks());
        assertEquals(2L, response.getSummary().getOpenIssues());
        assertEquals(4L, response.getSummary().getTotalFeedback());
        assertEquals(1L, response.getSummary().getTotalNotes());
        assertEquals(60.0, response.getTaskCompletionRate(), 0.01);
        assertEquals(1, response.getRecentTasks().size());
    }

    @Test
    void getDashboard_noTasks_zeroCompletionRate() {
        when(taskRepository.countByUserId(userId)).thenReturn(0L);
        when(taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED)).thenReturn(0L);
        when(issueRepository.countByUserIdAndStatusIn(eq(userId), anyList())).thenReturn(0L);
        when(feedbackRepository.countByUserId(userId)).thenReturn(0L);
        when(noteRepository.countByUserId(userId)).thenReturn(0L);

        when(taskRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(issueRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(feedbackRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(noteRepository.findByUserWithFilters(eq(userId), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardResponse response = dashboardService.getDashboard(userId);

        assertEquals(0.0, response.getTaskCompletionRate());
        assertEquals(0, response.getSummary().getTotalTasks());
    }

    @Test
    void getDashboardForUser_delegatesToGetDashboard() {
        when(taskRepository.countByUserId(userId)).thenReturn(1L);
        when(taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED)).thenReturn(1L);
        when(issueRepository.countByUserIdAndStatusIn(eq(userId), anyList())).thenReturn(0L);
        when(feedbackRepository.countByUserId(userId)).thenReturn(0L);
        when(noteRepository.countByUserId(userId)).thenReturn(0L);

        when(taskRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(issueRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(feedbackRepository.findByUserWithFilters(eq(userId), any(), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(noteRepository.findByUserWithFilters(eq(userId), any(), any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardResponse response = dashboardService.getDashboardForUser(userId);

        assertNotNull(response);
        assertEquals(100.0, response.getTaskCompletionRate());
    }
}
