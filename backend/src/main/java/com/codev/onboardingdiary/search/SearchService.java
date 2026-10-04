package com.codev.onboardingdiary.search;

import static com.codev.onboardingdiary.diary.DiarySpecifications.containsText;
import static com.codev.onboardingdiary.diary.DiarySpecifications.likePattern;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.dashboard.RecentEntry.EntryType;
import com.codev.onboardingdiary.diary.DiaryEntry;
import com.codev.onboardingdiary.diary.DiarySpecifications;
import com.codev.onboardingdiary.feedback.FeedbackRepository;
import com.codev.onboardingdiary.issue.IssueRepository;
import com.codev.onboardingdiary.manager.ManagerService;
import com.codev.onboardingdiary.note.Note;
import com.codev.onboardingdiary.note.NoteRepository;
import com.codev.onboardingdiary.task.TaskRepository;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.Role;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Full-text search across tasks, issues, feedback and notes, scoped to what the caller may see. */
@Service
public class SearchService {

  static final int MIN_QUERY_LENGTH = 2;
  static final int MAX_QUERY_LENGTH = 100;
  static final int MAX_LIMIT = 50;
  private static final int SNIPPET_LENGTH = 160;

  private final TaskRepository taskRepository;
  private final IssueRepository issueRepository;
  private final FeedbackRepository feedbackRepository;
  private final NoteRepository noteRepository;
  private final ManagerService managerService;
  private final ProfileRepository profileRepository;

  public SearchService(
      TaskRepository taskRepository,
      IssueRepository issueRepository,
      FeedbackRepository feedbackRepository,
      NoteRepository noteRepository,
      ManagerService managerService,
      ProfileRepository profileRepository) {
    this.taskRepository = taskRepository;
    this.issueRepository = issueRepository;
    this.feedbackRepository = feedbackRepository;
    this.noteRepository = noteRepository;
    this.managerService = managerService;
    this.profileRepository = profileRepository;
  }

  @Transactional(readOnly = true)
  public SearchResults search(
      AuthenticatedUser viewer,
      String rawQuery,
      SearchScope scope,
      Collection<EntryType> types,
      int limit) {
    String query = rawQuery == null ? "" : rawQuery.strip();
    if (query.length() < MIN_QUERY_LENGTH) {
      throw ApiException.invalidField("q", "Enter at least " + MIN_QUERY_LENGTH + " characters");
    }
    if (query.length() > MAX_QUERY_LENGTH) {
      throw ApiException.invalidField("q", "Use at most " + MAX_QUERY_LENGTH + " characters");
    }
    if (limit < 1 || limit > MAX_LIMIT) {
      throw ApiException.invalidField("limit", "Must be between 1 and " + MAX_LIMIT);
    }
    Map<Long, String> owners = owners(viewer, scope);
    Set<EntryType> wanted =
        types == null || types.isEmpty() ? EnumSet.allOf(EntryType.class) : EnumSet.copyOf(types);
    Pageable page =
        PageRequest.of(0, limit, Sort.by(Sort.Order.desc("entryDate"), Sort.Order.desc("id")));
    boolean sharedNotesOnly = scope == SearchScope.TEAM;

    List<SearchResults.Group> groups = new ArrayList<>();
    for (EntryType type : EntryType.values()) {
      if (!wanted.contains(type)) {
        continue;
      }
      SearchResults.Group group =
          owners.isEmpty()
              ? new SearchResults.Group(type, 0, List.of())
              : switch (type) {
                case TASK ->
                    find(
                        type,
                        taskRepository,
                        containsText(query, "title", "description"),
                        owners,
                        page,
                        task ->
                            hit(
                                type,
                                task,
                                owners,
                                task.getTitle(),
                                task.getStatus().name(),
                                query,
                                task.getDescription()));
                case ISSUE ->
                    find(
                        type,
                        issueRepository,
                        containsText(query, "title", "description", "resolutionNotes"),
                        owners,
                        page,
                        issue ->
                            hit(
                                type,
                                issue,
                                owners,
                                issue.getTitle(),
                                issue.getStatus().name(),
                                query,
                                issue.getDescription(),
                                issue.getResolutionNotes()));
                case FEEDBACK ->
                    find(
                        type,
                        feedbackRepository,
                        containsText(query, "subject", "details"),
                        owners,
                        page,
                        feedback ->
                            hit(
                                type,
                                feedback,
                                owners,
                                feedback.getSubject(),
                                feedback.getType().name(),
                                query,
                                feedback.getDetails()));
                case NOTE ->
                    find(
                        type,
                        noteRepository,
                        noteMatches(query, sharedNotesOnly),
                        owners,
                        page,
                        note ->
                            hit(
                                type,
                                note,
                                owners,
                                note.getTitle(),
                                null,
                                query,
                                note.getContent(),
                                String.join(" ", note.getTags())));
              };
      groups.add(group);
    }
    return new SearchResults(query, scope, groups);
  }

  private Map<Long, String> owners(AuthenticatedUser viewer, SearchScope scope) {
    Map<Long, String> owners = new LinkedHashMap<>();
    if (scope == SearchScope.TEAM) {
      if (!viewer.hasRole(Role.MANAGER) && !viewer.hasRole(Role.ADMIN)) {
        throw ApiException.forbidden("Only managers and admins can search their team");
      }
      for (Profile profile : managerService.visibleRecruits(viewer)) {
        owners.put(profile.getUserId(), profile.getFullName());
      }
    } else {
      owners.put(
          viewer.id(), profileRepository.findFullNameByUserId(viewer.id()).orElse(viewer.email()));
    }
    return owners;
  }

  private static <T extends DiaryEntry> SearchResults.Group find(
      EntryType type,
      JpaSpecificationExecutor<T> repository,
      Specification<T> matches,
      Map<Long, String> owners,
      Pageable page,
      Function<T, SearchHit> toHit) {
    Specification<T> spec =
        Specification.where(DiarySpecifications.<T>valueIn("ownerId", owners.keySet()))
            .and(matches);
    Page<T> result = repository.findAll(spec, page);
    return new SearchResults.Group(
        type, result.getTotalElements(), result.getContent().stream().map(toHit).toList());
  }

  private static Specification<Note> noteMatches(String query, boolean sharedOnly) {
    Specification<Note> tagMatches =
        (root, criteria, cb) -> {
          Subquery<Long> tagged = criteria.subquery(Long.class);
          Root<Note> note = tagged.from(Note.class);
          Join<Note, String> tag = note.join("tags");
          tagged.select(note.get("id")).where(cb.like(tag, likePattern(query), '\\'));
          return root.get("id").in(tagged);
        };
    Specification<Note> matches =
        Specification.<Note>where(containsText(query, "title", "content")).or(tagMatches);
    if (!sharedOnly) {
      return matches;
    }
    return matches.and((root, criteria, cb) -> cb.isTrue(root.get("shared")));
  }

  private static SearchHit hit(
      EntryType type,
      DiaryEntry entry,
      Map<Long, String> owners,
      String title,
      String status,
      String query,
      String... bodies) {
    return new SearchHit(
        type,
        entry.getId(),
        entry.getOwnerId(),
        owners.get(entry.getOwnerId()),
        entry.getEntryDate(),
        title,
        snippet(query, bodies),
        status);
  }

  /** Excerpt of the first body that contains the query, or the start of the first body. */
  static String snippet(String query, String... bodies) {
    List<String> texts =
        Stream.of(bodies)
            .filter(Objects::nonNull)
            .map(String::strip)
            .filter(s -> !s.isEmpty())
            .map(s -> s.replaceAll("\\s+", " "))
            .toList();
    if (texts.isEmpty()) {
      return null;
    }
    String needle = query.toLowerCase(Locale.ROOT);
    for (String text : texts) {
      int at = text.toLowerCase(Locale.ROOT).indexOf(needle);
      if (at >= 0) {
        int start = Math.max(0, at - SNIPPET_LENGTH / 3);
        int end = Math.min(text.length(), start + SNIPPET_LENGTH);
        return (start > 0 ? "…" : "")
            + text.substring(start, end)
            + (end < text.length() ? "…" : "");
      }
    }
    String first = texts.get(0);
    return first.length() <= SNIPPET_LENGTH ? first : first.substring(0, SNIPPET_LENGTH) + "…";
  }
}
