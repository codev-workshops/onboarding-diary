package com.onboardingdiary.service;

import com.onboardingdiary.dto.SearchEntityType;
import com.onboardingdiary.dto.SearchResponse;
import com.onboardingdiary.dto.SearchSort;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.FeedbackType;
import com.onboardingdiary.entity.Note;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

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
    private SearchService searchService;

    private Task task(long id, String title, String description, LocalDate date, Instant updated) {
        Task t = new Task();
        t.setOwnerId(5L);
        t.setDate(date);
        t.setTitle(title);
        t.setDescription(description);
        t.setCategory(TaskCategory.LEARNING);
        t.setStatus(TaskStatus.TODO);
        t.setPriority(TaskPriority.LOW);
        ReflectionTestUtils.setField(t, "id", id);
        ReflectionTestUtils.setField(t, "updatedAt", updated);
        return t;
    }

    private Note note(long id, String title, String content, LocalDate date, Instant updated) {
        Note n = new Note();
        n.setOwnerId(5L);
        n.setDate(date);
        n.setTitle(title);
        n.setContent(content);
        ReflectionTestUtils.setField(n, "id", id);
        ReflectionTestUtils.setField(n, "updatedAt", updated);
        return n;
    }

    private Feedback feedback(long id, String subject, String details, LocalDate date, Instant updated) {
        Feedback f = new Feedback();
        f.setOwnerId(5L);
        f.setDate(date);
        f.setSubject(subject);
        f.setType(FeedbackType.POSITIVE);
        f.setDetails(details);
        ReflectionTestUtils.setField(f, "id", id);
        ReflectionTestUtils.setField(f, "updatedAt", updated);
        return f;
    }

    private AuthenticatedUser recruit() {
        return new AuthenticatedUser(5L, "r@acme.com", "RECRUIT");
    }

    @SafeVarargs
    private <T> PageImpl<T> page(T... items) {
        return new PageImpl<>(List.of(items));
    }

    @SuppressWarnings("unchecked")
    private void stubEmptyAll() {
        lenient().when(taskRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());
        lenient().when(issueRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());
        lenient().when(feedbackRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());
        lenient().when(noteRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());
    }

    @Test
    void blankQueryIsRejected() {
        assertThatThrownBy(() -> searchService.search(recruit(), "   ", null, SearchSort.RELEVANCE))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void titleMatchOutscoresBodyMatchUnderRelevanceSort() {
        Instant now = Instant.parse("2026-02-01T00:00:00Z");
        Task titleHit = task(1L, "Onboarding plan", "nothing here", LocalDate.of(2026, 1, 1), now);
        Task bodyHit = task(2L, "Random", "the onboarding doc", LocalDate.of(2026, 1, 2), now);
        when(taskRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page(bodyHit, titleHit));
        lenient().when(issueRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());
        lenient().when(feedbackRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());
        lenient().when(noteRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());

        SearchResponse response = searchService.search(recruit(), "onboarding", null, SearchSort.RELEVANCE);

        assertThat(response.results()).hasSize(2);
        assertThat(response.results().get(0).id()).isEqualTo(1L);
        assertThat(response.results().get(0).score()).isGreaterThan(response.results().get(1).score());
    }

    @Test
    @SuppressWarnings("unchecked")
    void dateSortOrdersByDateDescAcrossTypes() {
        Instant now = Instant.parse("2026-02-01T00:00:00Z");
        when(taskRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page(task(1L, "alpha onboarding", "x", LocalDate.of(2026, 1, 1), now)));
        when(noteRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page(note(2L, "onboarding recap", "y", LocalDate.of(2026, 3, 1), now)));
        when(feedbackRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page(feedback(3L, "onboarding buddy", "z", LocalDate.of(2026, 2, 1), now)));
        lenient().when(issueRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());

        SearchResponse response = searchService.search(recruit(), "onboarding", null, SearchSort.DATE);

        assertThat(response.results()).extracting(SearchResponse.SearchResult::date)
                .containsExactly(LocalDate.of(2026, 3, 1), LocalDate.of(2026, 2, 1), LocalDate.of(2026, 1, 1));
    }

    @Test
    @SuppressWarnings("unchecked")
    void typeFilterQueriesOnlyRequestedRepositories() {
        when(taskRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page());

        searchService.search(recruit(), "x", Set.of(SearchEntityType.TASK), SearchSort.RELEVANCE);

        verify(taskRepository).findAll(any(Specification.class), any(Pageable.class));
        verify(issueRepository, never()).findAll(any(Specification.class), any(Pageable.class));
        verify(feedbackRepository, never()).findAll(any(Specification.class), any(Pageable.class));
        verify(noteRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void managerScopeIncludesAssignedRecruits() {
        stubEmptyAll();
        when(userRepository.findIdsByManagerId(2L)).thenReturn(List.of(7L, 8L));

        searchService.search(new AuthenticatedUser(2L, "m@acme.com", "MANAGER"), "x", null, SearchSort.RELEVANCE);

        verify(userRepository).findIdsByManagerId(2L);
    }

    @Test
    void adminScopeDoesNotConsultManagerAssignments() {
        stubEmptyAll();
        searchService.search(new AuthenticatedUser(1L, "a@acme.com", "ADMIN"), "x", null, SearchSort.RELEVANCE);
        verify(userRepository, never()).findIdsByManagerId(any());
    }
}
