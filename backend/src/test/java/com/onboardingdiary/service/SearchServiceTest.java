package com.onboardingdiary.service;

import com.onboardingdiary.dto.response.SearchResponse;
import com.onboardingdiary.entity.*;
import com.onboardingdiary.enums.*;
import com.onboardingdiary.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private IssueRepository issueRepository;
    @Mock private FeedbackRepository feedbackRepository;
    @Mock private NoteRepository noteRepository;

    @InjectMocks private SearchService searchService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void search_findsAcrossAllEntities() {
        User user = new User();
        user.setId(userId);

        Task task = new Task();
        task.setId(UUID.randomUUID());
        task.setTitle("Setup VPN");
        task.setDescription("Configure VPN access");
        task.setDate(LocalDate.of(2026, 1, 15));
        task.setUser(user);

        Issue issue = new Issue();
        issue.setId(UUID.randomUUID());
        issue.setTitle("VPN Connection fails");
        issue.setDescription("Cannot connect to VPN");
        issue.setDate(LocalDate.of(2026, 1, 16));
        issue.setUser(user);

        when(taskRepository.search(userId, "VPN")).thenReturn(List.of(task));
        when(issueRepository.search(userId, "VPN")).thenReturn(List.of(issue));
        when(feedbackRepository.search(userId, "VPN")).thenReturn(List.of());
        when(noteRepository.search(userId, "VPN")).thenReturn(List.of());

        SearchResponse response = searchService.search(userId, "VPN");

        assertThat(response.getTotalResults()).isEqualTo(2);
        assertThat(response.getResults()).hasSize(2);
        assertThat(response.getResults().get(0).getType()).isEqualTo("TASK");
        assertThat(response.getResults().get(1).getType()).isEqualTo("ISSUE");
    }

    @Test
    void search_returnsEmptyForNoMatches() {
        when(taskRepository.search(userId, "nonexistent")).thenReturn(List.of());
        when(issueRepository.search(userId, "nonexistent")).thenReturn(List.of());
        when(feedbackRepository.search(userId, "nonexistent")).thenReturn(List.of());
        when(noteRepository.search(userId, "nonexistent")).thenReturn(List.of());

        SearchResponse response = searchService.search(userId, "nonexistent");

        assertThat(response.getTotalResults()).isEqualTo(0);
        assertThat(response.getResults()).isEmpty();
    }

    @Test
    void search_includesHighlightSnippet() {
        User user = new User();
        user.setId(userId);

        Task task = new Task();
        task.setId(UUID.randomUUID());
        task.setTitle("Configure development environment");
        task.setDescription("Set up IDE, install plugins and configure linting");
        task.setDate(LocalDate.of(2026, 1, 15));
        task.setUser(user);

        when(taskRepository.search(userId, "IDE")).thenReturn(List.of(task));
        when(issueRepository.search(userId, "IDE")).thenReturn(List.of());
        when(feedbackRepository.search(userId, "IDE")).thenReturn(List.of());
        when(noteRepository.search(userId, "IDE")).thenReturn(List.of());

        SearchResponse response = searchService.search(userId, "IDE");

        assertThat(response.getResults().get(0).getHighlight()).contains("IDE");
    }

    @Test
    void search_handlesNotes() {
        User user = new User();
        user.setId(userId);

        Note note = new Note();
        note.setId(UUID.randomUUID());
        note.setTitle("Team meeting notes");
        note.setContent("Discussed project roadmap and milestones");
        note.setDate(LocalDate.of(2026, 1, 20));
        note.setUser(user);

        when(taskRepository.search(userId, "roadmap")).thenReturn(List.of());
        when(issueRepository.search(userId, "roadmap")).thenReturn(List.of());
        when(feedbackRepository.search(userId, "roadmap")).thenReturn(List.of());
        when(noteRepository.search(userId, "roadmap")).thenReturn(List.of(note));

        SearchResponse response = searchService.search(userId, "roadmap");

        assertThat(response.getTotalResults()).isEqualTo(1);
        assertThat(response.getResults().get(0).getType()).isEqualTo("NOTE");
        assertThat(response.getResults().get(0).getTitle()).isEqualTo("Team meeting notes");
    }
}
