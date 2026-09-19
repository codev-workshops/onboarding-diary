package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.EntryCategory;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.SearchResultDto;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Extension 1: one query across tasks, issues, feedback and notes, always scoped to one owner. */
@Service
@Transactional(readOnly = true)
public class SearchService {

    private static final int SNIPPET_RADIUS = 60;

    private final TaskService taskService;
    private final IssueService issueService;
    private final FeedbackService feedbackService;
    private final NoteService noteService;
    private final AuthorizationService authorizationService;

    public SearchService(TaskService taskService,
                         IssueService issueService,
                         FeedbackService feedbackService,
                         NoteService noteService,
                         AuthorizationService authorizationService) {
        this.taskService = taskService;
        this.issueService = issueService;
        this.feedbackService = feedbackService;
        this.noteService = noteService;
        this.authorizationService = authorizationService;
    }

    public List<SearchResultDto> search(AppUserDetails principal, Long ownerId, String query) {
        authorizationService.requireReadAccess(principal, ownerId);
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String q = query.trim();
        List<SearchResultDto> results = new ArrayList<>();

        taskService.searchText(ownerId, q).forEach(task -> results.add(new SearchResultDto(
                EntryCategory.TASK, task.getId(), task.getDate(), task.getTitle(),
                snippet(q, task.getTitle(), task.getDescription(), task.getCategory()),
                "/tasks/edit/" + task.getId())));

        issueService.searchText(ownerId, q).forEach(issue -> results.add(new SearchResultDto(
                EntryCategory.ISSUE, issue.getId(), issue.getDate(), issue.getTitle(),
                snippet(q, issue.getTitle(), issue.getDescription(), issue.getResolutionNotes()),
                "/issues/edit/" + issue.getId())));

        feedbackService.searchText(ownerId, q).forEach(item -> results.add(new SearchResultDto(
                EntryCategory.FEEDBACK, item.getId(), item.getDate(), item.getSubject(),
                snippet(q, item.getSubject(), item.getDetails()),
                "/feedback/edit/" + item.getId())));

        noteService.searchText(ownerId, q).forEach(note -> results.add(new SearchResultDto(
                EntryCategory.NOTE, note.getId(), note.getDate(), note.getTitle(),
                snippet(q, note.getTitle(), note.getContent(), note.getTags()),
                "/notes/edit/" + note.getId())));

        results.sort(Comparator.comparing(SearchResultDto::date).reversed()
                .thenComparing(SearchResultDto::category));
        return results;
    }

    /** Picks the first field containing the query and returns the matching part with context. */
    static String snippet(String query, String... fields) {
        String needle = query.toLowerCase(Locale.ROOT);
        for (String field : fields) {
            if (field == null || field.isBlank()) {
                continue;
            }
            int index = field.toLowerCase(Locale.ROOT).indexOf(needle);
            if (index < 0) {
                continue;
            }
            int start = Math.max(0, index - SNIPPET_RADIUS);
            int end = Math.min(field.length(), index + needle.length() + SNIPPET_RADIUS);
            String text = field.substring(start, end).replaceAll("\\s+", " ").trim();
            return (start > 0 ? "..." : "") + text + (end < field.length() ? "..." : "");
        }
        for (String field : fields) {
            if (field != null && !field.isBlank()) {
                return field.length() > SNIPPET_RADIUS * 2
                        ? field.substring(0, SNIPPET_RADIUS * 2) + "..."
                        : field;
            }
        }
        return "";
    }
}
