package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.RecentEntryResponse.EntryType;
import com.workshop.onboardingdiary.dto.SearchResponse;
import com.workshop.onboardingdiary.dto.SearchResponse.SearchGroup;
import com.workshop.onboardingdiary.dto.SearchResponse.SearchHit;
import com.workshop.onboardingdiary.dto.SearchResponse.SearchResults;
import com.workshop.onboardingdiary.entity.AdditionalNote;
import com.workshop.onboardingdiary.entity.FeedbackNote;
import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.TaskEntry;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.AdditionalNoteRepository;
import com.workshop.onboardingdiary.repository.FeedbackNoteRepository;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Free-text search across the four entry types for one user (REQUIREMENTS 9). The query is matched
 * as one literal substring, case-insensitively, and the scope is resolved by the same
 * {@link EntryAccessService#resolveListTarget} rule the dashboard and reports use, so an unknown or
 * out-of-scope {@code userId} is a 403 rather than a 404.
 */
@Service
public class SearchService {

    static final int MIN_QUERY_LENGTH = 2;
    static final int MAX_QUERY_LENGTH = 100;
    static final int GROUP_LIMIT = 50;
    static final int EXCERPT_LENGTH = 200;

    /** Characters that would otherwise act as wildcards inside a SQL {@code like} pattern. */
    private static final char ESCAPE_CHARACTER = '\\';

    /** One more row than the cap, so a full group can report that it was truncated. */
    private static final Pageable CAPPED = PageRequest.of(0, GROUP_LIMIT + 1);

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final FeedbackNoteRepository feedbackNoteRepository;
    private final AdditionalNoteRepository additionalNoteRepository;
    private final EntryAccessService access;

    public SearchService(TaskEntryRepository taskEntryRepository,
                         IssueEntryRepository issueEntryRepository,
                         FeedbackNoteRepository feedbackNoteRepository,
                         AdditionalNoteRepository additionalNoteRepository,
                         EntryAccessService access) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.feedbackNoteRepository = feedbackNoteRepository;
        this.additionalNoteRepository = additionalNoteRepository;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public SearchResponse search(String callerEmail, String rawQuery, Long userId) {
        String query = normaliseQuery(rawQuery);
        User caller = access.requireUser(callerEmail);
        User owner = access.resolveListTarget(caller, userId);
        Long ownerId = owner.getId();
        String pattern = escapeWildcards(query);

        SearchGroup tasks = group(taskEntryRepository.searchText(ownerId, pattern, CAPPED),
                task -> hit(EntryType.TASK, task.getId(), task.getEntryDate(), task.getTitle(), query,
                        fields(task.getTitle(), task.getDescription())));
        SearchGroup issues = group(issueEntryRepository.searchText(ownerId, pattern, CAPPED),
                issue -> hit(EntryType.ISSUE, issue.getId(), issue.getEntryDate(), issue.getTitle(), query,
                        fields(issue.getTitle(), issue.getDescription(), issue.getResolutionNotes())));
        SearchGroup feedback = group(feedbackNoteRepository.searchText(ownerId, pattern, CAPPED),
                note -> hit(EntryType.FEEDBACK, note.getId(), note.getEntryDate(), note.getSubject(), query,
                        fields(note.getSubject(), note.getDetails())));
        SearchGroup notes = group(additionalNoteRepository.searchText(ownerId, pattern, CAPPED),
                note -> hit(EntryType.NOTE, note.getId(), note.getEntryDate(), note.getTitle(), query,
                        fields(note.getTitle(), note.getContent(), tagLine(note))));

        int total = tasks.count() + issues.count() + feedback.count() + notes.count();
        return new SearchResponse(query, ownerId, total, new SearchResults(tasks, issues, feedback, notes));
    }

    /**
     * Trims the query, collapses internal whitespace runs to a single space and applies the length
     * rules of REQUIREMENTS 9.6, all as {@code $.errors.q} field errors.
     */
    static String normaliseQuery(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim().replaceAll("\\s+", " ");
        if (query.isEmpty()) {
            throw new FieldValidationException("q", "Search query is required");
        }
        if (query.length() < MIN_QUERY_LENGTH) {
            throw new FieldValidationException("q", "Search query must be at least 2 characters");
        }
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new FieldValidationException("q", "Search query may be at most 100 characters");
        }
        return query;
    }

    /** Makes {@code %}, {@code _} and the escape character itself match literally. */
    static String escapeWildcards(String query) {
        StringBuilder escaped = new StringBuilder(query.length() + 4);
        for (char character : query.toCharArray()) {
            if (character == '%' || character == '_' || character == ESCAPE_CHARACTER) {
                escaped.append(ESCAPE_CHARACTER);
            }
            escaped.append(character);
        }
        return escaped.toString();
    }

    private <T> SearchGroup group(List<T> rows, Function<T, SearchHit> toHit) {
        boolean truncated = rows.size() > GROUP_LIMIT;
        List<SearchHit> hits = new ArrayList<>(Math.min(rows.size(), GROUP_LIMIT));
        for (T row : rows.subList(0, Math.min(rows.size(), GROUP_LIMIT))) {
            hits.add(toHit.apply(row));
        }
        return new SearchGroup(hits.size(), truncated, List.copyOf(hits));
    }

    private SearchHit hit(EntryType type, Long id, LocalDate entryDate, String title, String query,
                          List<String> searchedFields) {
        return new SearchHit(type, id, entryDate, title, excerpt(searchedFields, query));
    }

    /** The searched fields in excerpt preference order; optional ones may be null. */
    private static List<String> fields(String... values) {
        return Arrays.asList(values);
    }

    /** Tag values are searched too, so they are an excerpt source for a note matched only by a tag. */
    private String tagLine(AdditionalNote note) {
        return note.getTags().isEmpty() ? null : "Tags: " + String.join(", ", note.getTags());
    }

    /**
     * Roughly {@link #EXCERPT_LENGTH} characters of the first field containing the query, centred on
     * the match; the first non-empty field truncated the same way when no field contains it, which
     * only happens for a match the database found in a field the excerpt does not read.
     */
    static String excerpt(List<String> searchedFields, String query) {
        String needle = query.toLowerCase(Locale.ROOT);
        String fallback = null;
        for (String field : searchedFields) {
            if (field == null || field.isBlank()) {
                continue;
            }
            if (fallback == null) {
                fallback = field;
            }
            int match = field.toLowerCase(Locale.ROOT).indexOf(needle);
            if (match >= 0) {
                return snippet(field, match);
            }
        }
        return fallback == null ? "" : snippet(fallback, 0);
    }

    private static String snippet(String text, int match) {
        if (text.length() <= EXCERPT_LENGTH) {
            return text;
        }
        int start = Math.max(0, match - EXCERPT_LENGTH / 4);
        int end = Math.min(text.length(), start + EXCERPT_LENGTH);
        start = Math.max(0, Math.min(start, end - EXCERPT_LENGTH));
        return (start > 0 ? "…" : "") + text.substring(start, end) + (end < text.length() ? "…" : "");
    }
}
