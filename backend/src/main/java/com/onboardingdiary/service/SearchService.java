package com.onboardingdiary.service;

import com.onboardingdiary.dto.response.SearchResponse;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final NoteRepository noteRepository;

    public SearchResponse search(UUID userId, String query) {
        List<SearchResponse.SearchResult> results = new ArrayList<>();

        List<Task> tasks = taskRepository.search(userId, query);
        for (Task t : tasks) {
            results.add(SearchResponse.SearchResult.builder()
                    .id(t.getId().toString())
                    .type("TASK")
                    .title(t.getTitle())
                    .description(t.getDescription())
                    .date(t.getDate().toString())
                    .highlight(extractHighlight(query, t.getTitle(), t.getDescription()))
                    .build());
        }

        List<Issue> issues = issueRepository.search(userId, query);
        for (Issue i : issues) {
            results.add(SearchResponse.SearchResult.builder()
                    .id(i.getId().toString())
                    .type("ISSUE")
                    .title(i.getTitle())
                    .description(i.getDescription())
                    .date(i.getDate().toString())
                    .highlight(extractHighlight(query, i.getTitle(), i.getDescription()))
                    .build());
        }

        List<Feedback> feedbacks = feedbackRepository.search(userId, query);
        for (Feedback f : feedbacks) {
            results.add(SearchResponse.SearchResult.builder()
                    .id(f.getId().toString())
                    .type("FEEDBACK")
                    .title(f.getSubject())
                    .description(f.getDetails())
                    .date(f.getDate().toString())
                    .highlight(extractHighlight(query, f.getSubject(), f.getDetails()))
                    .build());
        }

        List<Note> notes = noteRepository.search(userId, query);
        for (Note n : notes) {
            results.add(SearchResponse.SearchResult.builder()
                    .id(n.getId().toString())
                    .type("NOTE")
                    .title(n.getTitle())
                    .description(n.getContent())
                    .date(n.getDate().toString())
                    .highlight(extractHighlight(query, n.getTitle(), n.getContent()))
                    .build());
        }

        return SearchResponse.builder()
                .results(results)
                .totalResults(results.size())
                .build();
    }

    private String extractHighlight(String query, String... fields) {
        String lowerQuery = query.toLowerCase();
        for (String field : fields) {
            if (field != null && field.toLowerCase().contains(lowerQuery)) {
                int idx = field.toLowerCase().indexOf(lowerQuery);
                int start = Math.max(0, idx - 30);
                int end = Math.min(field.length(), idx + query.length() + 30);
                String snippet = (start > 0 ? "..." : "") + field.substring(start, end) + (end < field.length() ? "..." : "");
                return snippet;
            }
        }
        return "";
    }
}
