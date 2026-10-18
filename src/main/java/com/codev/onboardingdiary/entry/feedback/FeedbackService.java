package com.codev.onboardingdiary.entry.feedback;

import static com.codev.onboardingdiary.entry.EntrySpecs.attributeEquals;
import static com.codev.onboardingdiary.entry.EntrySpecs.dateBetween;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.DateRules;
import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.user.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Feedback use cases. All operations are scoped to the given owner. */
@Service
public class FeedbackService {

  private final FeedbackRepository repository;
  private final DateRules dateRules;

  public FeedbackService(FeedbackRepository repository, DateRules dateRules) {
    this.repository = repository;
    this.dateRules = dateRules;
  }

  @Transactional(readOnly = true)
  public PageResponse<FeedbackDto> list(User owner, FeedbackFilter filter, Pageable pageable) {
    DateRules.requireValidRange(filter.from(), filter.to());
    Specification<FeedbackEntry> spec =
        Specification.where(EntrySpecs.<FeedbackEntry>ownedBy(owner))
            .and(dateBetween(filter.from(), filter.to()))
            .and(attributeEquals("type", filter.type()));
    return PageResponse.of(repository.findAll(spec, pageable), FeedbackDto::of);
  }

  @Transactional(readOnly = true)
  public FeedbackDto get(User owner, Long id) {
    return FeedbackDto.of(find(owner, id));
  }

  @Transactional
  public FeedbackDto create(User owner, FeedbackRequest request) {
    FeedbackEntry feedback = new FeedbackEntry(owner);
    apply(feedback, request);
    return FeedbackDto.of(repository.save(feedback));
  }

  @Transactional
  public FeedbackDto update(User owner, Long id, FeedbackRequest request) {
    FeedbackEntry feedback = find(owner, id);
    apply(feedback, request);
    return FeedbackDto.of(repository.saveAndFlush(feedback));
  }

  @Transactional
  public void delete(User owner, Long id) {
    repository.delete(find(owner, id));
  }

  private FeedbackEntry find(User owner, Long id) {
    return repository
        .findByIdAndOwner(id, owner)
        .orElseThrow(() -> ApiException.notFound("Feedback not found"));
  }

  private void apply(FeedbackEntry feedback, FeedbackRequest request) {
    dateRules.requireNotFuture(request.entryDate(), "entryDate");
    feedback.setEntryDate(request.entryDate());
    feedback.setSubject(request.subject());
    feedback.setType(request.type());
    feedback.setDetails(request.details());
  }
}
