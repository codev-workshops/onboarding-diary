package com.onboardingdiary.service;

import com.onboardingdiary.dto.SearchEntityType;
import com.onboardingdiary.dto.SearchResponse;
import com.onboardingdiary.dto.SearchResponse.SearchResult;
import com.onboardingdiary.dto.SearchSort;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.exception.ValidationException;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class SearchService {

    private static final int PER_TYPE_LIMIT = 50;
    private static final int MAX_RESULTS = 100;
    private static final int SNIPPET_RADIUS = 60;

    private static final int TITLE_WEIGHT = 2;
    private static final int BODY_WEIGHT = 1;

    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public SearchService(TaskRepository taskRepository,
                         IssueRepository issueRepository,
                         FeedbackRepository feedbackRepository,
                         NoteRepository noteRepository,
                         UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.issueRepository = issueRepository;
        this.feedbackRepository = feedbackRepository;
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public SearchResponse search(AuthenticatedUser caller, String query,
                                 Set<SearchEntityType> types, SearchSort sort) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            throw new ValidationException("Search query must not be blank");
        }

        Set<SearchEntityType> requested = (types == null || types.isEmpty())
                ? Set.of(SearchEntityType.values())
                : types;
        SearchSort effectiveSort = sort == null ? SearchSort.RELEVANCE : sort;
        Set<Long> ownerIds = visibleOwnerIds(caller);

        List<SearchResult> results = new ArrayList<>();
        if (requested.contains(SearchEntityType.TASK)) {
            for (Task t : taskRepository.findAll(taskSpec(ownerIds, q), perType())) {
                results.add(toResult(SearchEntityType.TASK, t.getId(), t.getOwnerId(), t.getTitle(),
                        q, t.getDate(), t.getUpdatedAt(), t.getTitle(), t.getDescription()));
            }
        }
        if (requested.contains(SearchEntityType.ISSUE)) {
            for (Issue i : issueRepository.findAll(issueSpec(ownerIds, q), perType())) {
                results.add(toResult(SearchEntityType.ISSUE, i.getId(), i.getOwnerId(), i.getTitle(),
                        q, i.getDate(), i.getUpdatedAt(), i.getTitle(), i.getDescription(), i.getResolutionNotes()));
            }
        }
        if (requested.contains(SearchEntityType.FEEDBACK)) {
            for (Feedback f : feedbackRepository.findAll(feedbackSpec(ownerIds, q), perType())) {
                results.add(toResult(SearchEntityType.FEEDBACK, f.getId(), f.getOwnerId(), f.getSubject(),
                        q, f.getDate(), f.getUpdatedAt(), f.getSubject(), f.getDetails()));
            }
        }
        if (requested.contains(SearchEntityType.NOTE)) {
            for (Note n : noteRepository.findAll(noteSpec(ownerIds, q), perType())) {
                results.add(toResult(SearchEntityType.NOTE, n.getId(), n.getOwnerId(), n.getTitle(),
                        q, n.getDate(), n.getUpdatedAt(), n.getTitle(), n.getContent()));
            }
        }

        Comparator<SearchResult> comparator = effectiveSort == SearchSort.DATE
                ? Comparator.comparing(SearchResult::date).reversed()
                        .thenComparing(SearchResult::occurredAt, Comparator.reverseOrder())
                : Comparator.comparingInt(SearchResult::score).reversed()
                        .thenComparing(SearchResult::occurredAt, Comparator.reverseOrder());

        List<SearchResult> sorted = results.stream()
                .sorted(comparator)
                .limit(MAX_RESULTS)
                .toList();

        return new SearchResponse(q, sorted.size(), sorted);
    }

    private PageRequest perType() {
        return PageRequest.of(0, PER_TYPE_LIMIT, Sort.by(Sort.Direction.DESC, "updatedAt"));
    }

    private Specification<Task> taskSpec(Set<Long> ownerIds, String q) {
        return (root, query, cb) -> cb.and(ownerPredicate(ownerIds, root, cb),
                anyLike(cb, q, root.get("title"), root.get("description")));
    }

    private Specification<Issue> issueSpec(Set<Long> ownerIds, String q) {
        return (root, query, cb) -> cb.and(ownerPredicate(ownerIds, root, cb),
                anyLike(cb, q, root.get("title"), root.get("description"), root.get("resolutionNotes")));
    }

    private Specification<Feedback> feedbackSpec(Set<Long> ownerIds, String q) {
        return (root, query, cb) -> cb.and(ownerPredicate(ownerIds, root, cb),
                anyLike(cb, q, root.get("subject"), root.get("details")));
    }

    private Specification<Note> noteSpec(Set<Long> ownerIds, String q) {
        return (root, query, cb) -> cb.and(ownerPredicate(ownerIds, root, cb),
                anyLike(cb, q, root.get("title"), root.get("content")));
    }

    private Predicate ownerPredicate(Set<Long> ownerIds,
                                     jakarta.persistence.criteria.Root<?> root,
                                     jakarta.persistence.criteria.CriteriaBuilder cb) {
        if (ownerIds == null) {
            return cb.conjunction();
        }
        return root.get("ownerId").in(ownerIds);
    }

    @SafeVarargs
    private Predicate anyLike(jakarta.persistence.criteria.CriteriaBuilder cb, String q,
                              jakarta.persistence.criteria.Expression<String>... fields) {
        String pattern = "%" + q.toLowerCase() + "%";
        List<Predicate> likes = new ArrayList<>();
        for (jakarta.persistence.criteria.Expression<String> field : fields) {
            likes.add(cb.like(cb.lower(field), pattern));
        }
        return cb.or(likes.toArray(new Predicate[0]));
    }

    private SearchResult toResult(SearchEntityType type, Long id, Long ownerId, String title,
                                  String q, java.time.LocalDate date, java.time.Instant occurredAt,
                                  String titleField, String... bodyFields) {
        String lowerQ = q.toLowerCase();
        int score = 0;
        if (containsIgnoreCase(titleField, lowerQ)) {
            score += TITLE_WEIGHT;
        }
        String snippet = null;
        for (String body : bodyFields) {
            if (containsIgnoreCase(body, lowerQ)) {
                score += BODY_WEIGHT;
                if (snippet == null) {
                    snippet = excerpt(body, lowerQ);
                }
            }
        }
        if (snippet == null) {
            snippet = title;
        }
        return new SearchResult(type, id, ownerId, title, snippet, date, occurredAt, score);
    }

    private boolean containsIgnoreCase(String value, String lowerNeedle) {
        return value != null && value.toLowerCase().contains(lowerNeedle);
    }

    private String excerpt(String text, String lowerNeedle) {
        int idx = text.toLowerCase().indexOf(lowerNeedle);
        if (idx < 0) {
            return text.length() > SNIPPET_RADIUS * 2 ? text.substring(0, SNIPPET_RADIUS * 2) + "…" : text;
        }
        int start = Math.max(0, idx - SNIPPET_RADIUS);
        int end = Math.min(text.length(), idx + lowerNeedle.length() + SNIPPET_RADIUS);
        String slice = text.substring(start, end);
        if (start > 0) {
            slice = "…" + slice;
        }
        if (end < text.length()) {
            slice = slice + "…";
        }
        return slice;
    }

    private Set<Long> visibleOwnerIds(AuthenticatedUser caller) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return null;
        }
        Set<Long> ids = new HashSet<>();
        ids.add(caller.id());
        if (role == Role.MANAGER) {
            ids.addAll(userRepository.findIdsByManagerId(caller.id()));
        }
        return ids;
    }
}
