package com.codev.onboardingdiary.entry.note;

import static com.codev.onboardingdiary.entry.EntrySpecs.dateBetween;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.DateRules;
import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Texts;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.user.User;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Note use cases. All operations are scoped to the given owner. */
@Service
public class NoteService {

  private final NoteRepository repository;
  private final DateRules dateRules;

  public NoteService(NoteRepository repository, DateRules dateRules) {
    this.repository = repository;
    this.dateRules = dateRules;
  }

  @Transactional(readOnly = true)
  public PageResponse<NoteDto> list(User owner, NoteFilter filter, Pageable pageable) {
    DateRules.requireValidRange(filter.from(), filter.to());
    Specification<Note> spec =
        Specification.where(EntrySpecs.<Note>ownedBy(owner))
            .and(dateBetween(filter.from(), filter.to()))
            .and(hasTag(filter.tag()));
    return PageResponse.of(repository.findAll(spec, pageable), NoteDto::of);
  }

  @Transactional(readOnly = true)
  public List<String> tags(User owner) {
    return repository.findDistinctTags(owner);
  }

  @Transactional(readOnly = true)
  public NoteDto get(User owner, Long id) {
    return NoteDto.of(find(owner, id));
  }

  @Transactional
  public NoteDto create(User owner, NoteRequest request) {
    Note note = new Note(owner);
    apply(note, request);
    return NoteDto.of(repository.save(note));
  }

  @Transactional
  public NoteDto update(User owner, Long id, NoteRequest request) {
    Note note = find(owner, id);
    apply(note, request);
    return NoteDto.of(repository.saveAndFlush(note));
  }

  @Transactional
  public void delete(User owner, Long id) {
    repository.delete(find(owner, id));
  }

  private Note find(User owner, Long id) {
    return repository
        .findByIdAndOwner(id, owner)
        .orElseThrow(() -> ApiException.notFound("Note not found"));
  }

  private void apply(Note note, NoteRequest request) {
    dateRules.requireNotFuture(request.entryDate(), "entryDate");
    note.setEntryDate(request.entryDate());
    note.setTitle(request.title());
    note.setContent(request.content());
    note.replaceTags(NoteTags.normalize(request.tags()));
  }

  private static Specification<Note> hasTag(String rawTag) {
    String tag = Texts.trimToNull(rawTag);
    if (tag == null) {
      return null;
    }
    String normalized = tag.toLowerCase(Locale.ROOT);
    return (root, query, cb) -> cb.isMember(normalized, root.<Collection<String>>get("tags"));
  }
}
