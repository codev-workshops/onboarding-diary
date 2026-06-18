package com.onboardingdiary.service;

import com.onboardingdiary.dto.DashboardResponse;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @SuppressWarnings("unchecked")
    private void stubCountsAndEmptyPages(long count) {
        when(taskRepository.count(any(Specification.class))).thenReturn(count);
        when(issueRepository.count(any(Specification.class))).thenReturn(count);
        when(feedbackRepository.count(any(Specification.class))).thenReturn(count);
        when(noteRepository.count(any(Specification.class))).thenReturn(count);
        Page<?> empty = new PageImpl<>(List.of());
        lenient().when(taskRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn((Page) empty);
        lenient().when(issueRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn((Page) empty);
        lenient().when(feedbackRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn((Page) empty);
        lenient().when(noteRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn((Page) empty);
    }

    @Test
    void adminScopeDoesNotQueryManagerAssignments() {
        stubCountsAndEmptyPages(2L);
        DashboardResponse response = dashboardService.load(new AuthenticatedUser(1L, "a@acme.com", "ADMIN"));

        assertThat(response.summary().tasks()).isEqualTo(2L);
        assertThat(response.summary().notes()).isEqualTo(2L);
        verify(userRepository, never()).findIdsByManagerId(any());
    }

    @Test
    void managerScopeIncludesAssignedRecruits() {
        stubCountsAndEmptyPages(1L);
        when(userRepository.findIdsByManagerId(7L)).thenReturn(List.of(8L, 9L));

        dashboardService.load(new AuthenticatedUser(7L, "m@acme.com", "MANAGER"));

        verify(userRepository).findIdsByManagerId(7L);
    }

    @Test
    void taskCompletionRateComputedFromDoneOverTotal() {
        // Every status bucket returns 2 -> total = 3 buckets * 2 = 6, completed (DONE) = 2.
        stubCountsAndEmptyPages(2L);
        DashboardResponse response = dashboardService.load(new AuthenticatedUser(5L, "r@acme.com", "RECRUIT"));

        assertThat(response.taskMetrics().total()).isEqualTo(6L);
        assertThat(response.taskMetrics().completed()).isEqualTo(2L);
        assertThat(response.taskMetrics().completionRate()).isCloseTo(2.0 / 6.0, within(1e-9));
        assertThat(response.issueMetrics().open()).isEqualTo(4L); // OPEN + IN_PROGRESS
        assertThat(response.issueMetrics().byStatus()).containsKeys("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED");
        assertThat(response.issueMetrics().bySeverity()).containsKeys("LOW", "MEDIUM", "HIGH", "CRITICAL");
    }
}
