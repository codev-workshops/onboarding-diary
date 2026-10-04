package com.codev.onboardingdiary.note;

import static com.codev.onboardingdiary.diary.DiarySpecifications.containsText;
import static com.codev.onboardingdiary.diary.DiarySpecifications.entryDateBetween;
import static com.codev.onboardingdiary.diary.DiarySpecifications.ownedBy;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.diary.DiaryPaging;
import com.codev.onboardingdiary.diary.EntryDatePolicy;
import com.codev.onboardingdiary.diary.OptimisticLock;
import com.codev.onboardingdiary.diary.PageResponse;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoteService {

  private static final Set<String> SORTS = Set.of("title");

  private final NoteRepository repository;
  private final EntryDatePolicy entryDatePolicy;

  public NoteService(NoteRepository repository, EntryDatePolicy entryDatePolicy) {
    this.repository = repository;
    this.entryDatePolicy = entryDatePolicy;
  }

  @Transactional(readOnly = true)
  public PageResponse<NoteResponse> list(
      Long ownerId, LocalDate from, LocalDate to, List<String> tags, String q, Pageable pageable) {
    return list(ownerId, from, to, tags, q, false, pageable);
  }

  /** Lists notes; {@code sharedOnly} restricts the result to notes shared with the manager. */
  @Transactional(readOnly = true)
  public PageResponse<NoteResponse> list(
      Long ownerId,
      LocalDate from,
      LocalDate to,
      List<String> tags,
      String q,
      boolean sharedOnly,
      Pageable pageable) {
    Specification<Note> spec =
        Specification.<Note>where(ownedBy(ownerId))
            .and(sharedOnly ? (root, query, cb) -> cb.isTrue(root.get("shared")) : null)
            .and(entryDateBetween(from, to))
            .and(taggedWithAny(NoteTags.normalizeToList(tags)))
            .and(containsText(q, "title", "content"));
    return PageResponse.from(
        repository.findAll(spec, DiaryPaging.normalize(pageable, SORTS)).map(NoteResponse::from));
  }

  @Transactional(readOnly = true)
  public NoteResponse get(Long ownerId, Long id) {
    return NoteResponse.from(find(ownerId, id));
  }

  @Transactional(readOnly = true)
  public List<String> tags(Long ownerId) {
    return repository.findDistinctTagsByOwnerId(ownerId);
  }

  @Transactional
  public NoteResponse create(Long ownerId, NoteRequest request) {
    Note note = new Note(ownerId);
    apply(note, request);
    return NoteResponse.from(repository.save(note));
  }

  @Transactional
  public NoteResponse update(Long ownerId, Long id, NoteRequest request) {
    Note note = find(ownerId, id);
    OptimisticLock.check(request.version(), note);
    apply(note, request);
    return NoteResponse.from(repository.saveAndFlush(note));
  }

  @Transactional
  public void delete(Long ownerId, Long id) {
    repository.delete(find(ownerId, id));
  }

  private void apply(Note note, NoteRequest request) {
    entryDatePolicy.validate(note.getOwnerId(), request.entryDate());
    Set<String> tags = NoteTags.normalize(request.tags());
    // Lower-casing can lengthen a tag (e.g. "\u0130" becomes two characters).
    if (tags.stream().anyMatch(tag -> tag.length() > NoteTags.MAX_LENGTH)) {
      throw ApiException.invalidField(
          "tags", "Tags can be at most " + NoteTags.MAX_LENGTH + " characters");
    }
    note.update(
        request.entryDate(),
        request.title().trim(),
        request.content().trim(),
        Boolean.TRUE.equals(request.shared()),
        tags);
  }

  private Note find(Long ownerId, Long id) {
    return repository
        .findByIdAndOwnerId(id, ownerId)
        .orElseThrow(() -> ApiException.notFound("Note not found"));
  }

  private static Specification<Note> taggedWithAny(List<String> tags) {
    return (root, query, cb) -> {
      if (tags.isEmpty()) {
        return null;
      }
      Subquery<Long> tagged = query.subquery(Long.class);
      Root<Note> note = tagged.from(Note.class);
      Join<Note, String> tag = note.join("tags");
      tagged.select(note.get("id")).where(cb.equal(note, root), tag.in(tags));
      return cb.exists(tagged);
    };
  }
}
