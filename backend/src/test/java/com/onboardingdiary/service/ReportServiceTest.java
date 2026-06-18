package com.onboardingdiary.service;

import com.onboardingdiary.dto.ReportData;
import com.onboardingdiary.dto.ReportType;
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
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

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
class ReportServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private IssueRepository issueRepository;
    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ReportService reportService;

    private Task task() {
        Task t = new Task();
        t.setOwnerId(5L);
        t.setDate(LocalDate.of(2026, 2, 1));
        t.setTitle("Read docs");
        t.setCategory(TaskCategory.LEARNING);
        t.setStatus(TaskStatus.DONE);
        t.setPriority(TaskPriority.LOW);
        t.setDescription("done it");
        return t;
    }

    private Issue issue() {
        Issue i = new Issue();
        i.setOwnerId(5L);
        i.setDate(LocalDate.of(2026, 2, 2));
        i.setTitle("VPN broken");
        i.setSeverity(IssueSeverity.HIGH);
        i.setStatus(IssueStatus.OPEN);
        i.setResolutionNotes(null);
        i.setDescription("cannot connect");
        return i;
    }

    private Feedback feedback() {
        Feedback f = new Feedback();
        f.setOwnerId(5L);
        f.setDate(LocalDate.of(2026, 2, 3));
        f.setSubject("Great buddy");
        f.setType(FeedbackType.POSITIVE);
        f.setDetails("very helpful");
        return f;
    }

    @SuppressWarnings("unchecked")
    private void stubEmpty() {
        lenient().when(taskRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
        lenient().when(issueRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
        lenient().when(feedbackRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
    }

    private AuthenticatedUser recruit() {
        return new AuthenticatedUser(5L, "r@acme.com", "RECRUIT");
    }

    @Test
    @SuppressWarnings("unchecked")
    void tasksReportHasSingleTaskSection() {
        stubEmpty();
        when(taskRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(task()));

        ReportData report = reportService.generate(recruit(), ReportType.TASKS, null, null, null);

        assertThat(report.title()).isEqualTo("Tasks Report");
        assertThat(report.sections()).hasSize(1);
        ReportData.Section section = report.sections().get(0);
        assertThat(section.name()).isEqualTo("Tasks");
        assertThat(section.headers()).contains("Status", "Priority");
        assertThat(section.rows()).hasSize(1);
        assertThat(section.rows().get(0)).contains("DONE", "Read docs");
    }

    @Test
    @SuppressWarnings("unchecked")
    void combinedReportHasThreeSections() {
        when(taskRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(task()));
        when(issueRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(issue()));
        when(feedbackRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(feedback()));

        ReportData report = reportService.generate(recruit(), ReportType.COMBINED, null, null, null);

        assertThat(report.title()).isEqualTo("Combined Report");
        assertThat(report.sections()).extracting(ReportData.Section::name)
                .containsExactly("Tasks", "Issues", "Feedback");
    }

    @Test
    void rejectsInvertedDateRange() {
        assertThatThrownBy(() -> reportService.generate(
                recruit(), ReportType.TASKS, LocalDate.of(2026, 3, 1), LocalDate.of(2026, 2, 1), null))
                .isInstanceOf(ValidationException.class);
        verify(taskRepository, never()).findAll(any(Specification.class), any(Sort.class));
    }

    @Test
    void managerCannotReportOnUnassignedOwner() {
        when(userRepository.findIdsByManagerId(2L)).thenReturn(List.of(6L));

        assertThatThrownBy(() -> reportService.generate(
                new AuthenticatedUser(2L, "m@acme.com", "MANAGER"), ReportType.TASKS, null, null, 99L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void adminScopeDoesNotConsultManagerAssignments() {
        stubEmpty();
        reportService.generate(new AuthenticatedUser(1L, "a@acme.com", "ADMIN"), ReportType.FEEDBACK, null, null, 42L);
        verify(userRepository, never()).findIdsByManagerId(any());
    }
}
