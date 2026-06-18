package com.onboardingdiary.service;

import com.onboardingdiary.dto.AnalyticsResponse;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.FeedbackType;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.TaskCategory;
import com.onboardingdiary.entity.TaskPriority;
import com.onboardingdiary.entity.TaskStatus;
import com.onboardingdiary.exception.ValidationException;
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
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

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
    private AnalyticsService analyticsService;

    private Task task(LocalDate date, TaskStatus status) {
        Task t = new Task();
        t.setOwnerId(5L);
        t.setDate(date);
        t.setTitle("t");
        t.setCategory(TaskCategory.LEARNING);
        t.setStatus(status);
        t.setPriority(TaskPriority.LOW);
        return t;
    }

    private Issue issue(LocalDate date, IssueSeverity severity, IssueStatus status) {
        Issue i = new Issue();
        i.setOwnerId(5L);
        i.setDate(date);
        i.setTitle("i");
        i.setSeverity(severity);
        i.setStatus(status);
        return i;
    }

    private Feedback feedback(LocalDate date, FeedbackType type) {
        Feedback f = new Feedback();
        f.setOwnerId(5L);
        f.setDate(date);
        f.setSubject("s");
        f.setType(type);
        return f;
    }

    private AuthenticatedUser recruit() {
        return new AuthenticatedUser(5L, "r@acme.com", "RECRUIT");
    }

    @SuppressWarnings("unchecked")
    private void stubLists(List<Task> tasks, List<Issue> issues, List<Feedback> feedback) {
        lenient().when(taskRepository.findAll(any(Specification.class))).thenReturn(tasks);
        lenient().when(issueRepository.findAll(any(Specification.class))).thenReturn(issues);
        lenient().when(feedbackRepository.findAll(any(Specification.class))).thenReturn(feedback);
        lenient().when(noteRepository.findAll(any(Specification.class))).thenReturn(List.of());
    }

    @Test
    void invertedDateRangeIsRejected() {
        assertThatThrownBy(() -> analyticsService.load(recruit(),
                LocalDate.of(2026, 3, 1), LocalDate.of(2026, 2, 1)))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void taskCompletionTrendGroupsByDateAndComputesRate() {
        LocalDate d1 = LocalDate.of(2026, 2, 1);
        LocalDate d2 = LocalDate.of(2026, 2, 2);
        stubLists(List.of(
                task(d1, TaskStatus.DONE),
                task(d1, TaskStatus.TODO),
                task(d2, TaskStatus.DONE)
        ), List.of(), List.of());

        AnalyticsResponse response = analyticsService.load(recruit(), null, null);

        assertThat(response.taskCompletionTrend()).hasSize(2);
        AnalyticsResponse.TaskCompletionPoint first = response.taskCompletionTrend().get(0);
        assertThat(first.date()).isEqualTo(d1);
        assertThat(first.total()).isEqualTo(2);
        assertThat(first.completed()).isEqualTo(1);
        assertThat(first.completionRate()).isEqualTo(0.5);
        assertThat(response.taskCompletionTrend().get(1).completionRate()).isEqualTo(1.0);
    }

    @Test
    void distributionsCoverAllEnumKeysAndCount() {
        stubLists(List.of(), List.of(
                issue(LocalDate.of(2026, 2, 1), IssueSeverity.HIGH, IssueStatus.OPEN),
                issue(LocalDate.of(2026, 2, 2), IssueSeverity.HIGH, IssueStatus.RESOLVED)
        ), List.of(
                feedback(LocalDate.of(2026, 2, 1), FeedbackType.POSITIVE)
        ));

        AnalyticsResponse response = analyticsService.load(recruit(), null, null);

        assertThat(response.issueSeverityDistribution())
                .containsKeys("LOW", "MEDIUM", "HIGH", "CRITICAL");
        assertThat(response.issueSeverityDistribution().get("HIGH")).isEqualTo(2);
        assertThat(response.issueSeverityDistribution().get("LOW")).isEqualTo(0);
        assertThat(response.issueStatusDistribution().get("OPEN")).isEqualTo(1);
        assertThat(response.issueStatusDistribution().get("RESOLVED")).isEqualTo(1);
        assertThat(response.feedbackTypeDistribution().get("POSITIVE")).isEqualTo(1);
        assertThat(response.feedbackTypeDistribution().get("CONCERN")).isEqualTo(0);
    }

    @Test
    void activityVolumeTrendSplitsByTypeAndSumsTotal() {
        LocalDate d1 = LocalDate.of(2026, 2, 1);
        stubLists(
                List.of(task(d1, TaskStatus.TODO), task(d1, TaskStatus.DONE)),
                List.of(issue(d1, IssueSeverity.LOW, IssueStatus.OPEN)),
                List.of(feedback(d1, FeedbackType.POSITIVE))
        );

        AnalyticsResponse response = analyticsService.load(recruit(), null, null);

        assertThat(response.activityVolumeTrend()).hasSize(1);
        AnalyticsResponse.ActivityVolumePoint point = response.activityVolumeTrend().get(0);
        assertThat(point.tasks()).isEqualTo(2);
        assertThat(point.issues()).isEqualTo(1);
        assertThat(point.feedback()).isEqualTo(1);
        assertThat(point.notes()).isEqualTo(0);
        assertThat(point.total()).isEqualTo(4);
    }

    @Test
    void managerScopeConsultsAssignedRecruits() {
        stubLists(List.of(), List.of(), List.of());
        when(userRepository.findIdsByManagerId(2L)).thenReturn(List.of(7L));

        analyticsService.load(new AuthenticatedUser(2L, "m@acme.com", "MANAGER"), null, null);

        verify(userRepository).findIdsByManagerId(2L);
    }

    @Test
    void adminScopeDoesNotConsultManagerAssignments() {
        stubLists(List.of(), List.of(), List.of());
        analyticsService.load(new AuthenticatedUser(1L, "a@acme.com", "ADMIN"), null, null);
        verify(userRepository, never()).findIdsByManagerId(any());
    }
}
