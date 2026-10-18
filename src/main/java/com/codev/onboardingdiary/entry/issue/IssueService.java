package com.codev.onboardingdiary.entry.issue;

import static com.codev.onboardingdiary.entry.EntrySpecs.attributeEquals;
import static com.codev.onboardingdiary.entry.EntrySpecs.dateBetween;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.DateRules;
import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Texts;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.user.User;
import java.time.Clock;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issue log use cases. All operations are scoped to the given owner. */
@Service
public class IssueService {

  private final IssueRepository repository;
  private final DateRules dateRules;
  private final Clock clock;

  public IssueService(IssueRepository repository, DateRules dateRules, Clock clock) {
    this.repository = repository;
    this.dateRules = dateRules;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public PageResponse<IssueDto> list(User owner, IssueFilter filter, Pageable pageable) {
    DateRules.requireValidRange(filter.from(), filter.to());
    Specification<IssueEntry> spec =
        Specification.where(EntrySpecs.<IssueEntry>ownedBy(owner))
            .and(dateBetween(filter.from(), filter.to()))
            .and(attributeEquals("status", filter.status()))
            .and(attributeEquals("severity", filter.severity()));
    return PageResponse.of(repository.findAll(spec, pageable), IssueDto::of);
  }

  @Transactional(readOnly = true)
  public IssueDto get(User owner, Long id) {
    return IssueDto.of(find(owner, id));
  }

  @Transactional
  public IssueDto create(User owner, IssueRequest request) {
    IssueEntry issue = new IssueEntry(owner);
    apply(issue, request);
    return IssueDto.of(repository.save(issue));
  }

  @Transactional
  public IssueDto update(User owner, Long id, IssueRequest request) {
    IssueEntry issue = find(owner, id);
    apply(issue, request);
    return IssueDto.of(repository.saveAndFlush(issue));
  }

  @Transactional
  public void delete(User owner, Long id) {
    repository.delete(find(owner, id));
  }

  private IssueEntry find(User owner, Long id) {
    return repository
        .findByIdAndOwner(id, owner)
        .orElseThrow(() -> ApiException.notFound("Issue not found"));
  }

  private void apply(IssueEntry issue, IssueRequest request) {
    dateRules.requireNotFuture(request.entryDate(), "entryDate");
    String resolutionNotes = Texts.trimToNull(request.resolutionNotes());
    if (!request.status().isOpen() && resolutionNotes == null) {
      throw ApiException.fieldError(
          "resolutionNotes", "is required when status is RESOLVED or CLOSED");
    }
    issue.setEntryDate(request.entryDate());
    issue.setTitle(request.title());
    issue.setDescription(Texts.trimToNull(request.description()));
    issue.setSeverity(request.severity());
    issue.setResolutionNotes(resolutionNotes);
    issue.changeStatus(request.status(), clock.instant());
  }
}
