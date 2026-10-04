package com.codev.onboardingdiary.feedback;

import static com.codev.onboardingdiary.diary.DiarySpecifications.entryDateBetween;
import static com.codev.onboardingdiary.diary.DiarySpecifications.ownedBy;
import static com.codev.onboardingdiary.diary.DiarySpecifications.valueIn;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.diary.DiaryPaging;
import com.codev.onboardingdiary.diary.EntryDatePolicy;
import com.codev.onboardingdiary.diary.OptimisticLock;
import com.codev.onboardingdiary.diary.PageResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FeedbackService {

  private static final Set<String> SORTS = Set.of("subject", "type");

  private final FeedbackRepository repository;
  private final EntryDatePolicy entryDatePolicy;

  public FeedbackService(FeedbackRepository repository, EntryDatePolicy entryDatePolicy) {
    this.repository = repository;
    this.entryDatePolicy = entryDatePolicy;
  }

  @Transactional(readOnly = true)
  public PageResponse<FeedbackResponse> list(
      Long ownerId, LocalDate from, LocalDate to, List<FeedbackType> types, Pageable pageable) {
    Specification<Feedback> spec =
        Specification.<Feedback>where(ownedBy(ownerId))
            .and(entryDateBetween(from, to))
            .and(valueIn("type", types));
    return PageResponse.from(
        repository
            .findAll(spec, DiaryPaging.normalize(pageable, SORTS))
            .map(FeedbackResponse::from));
  }

  @Transactional(readOnly = true)
  public FeedbackResponse get(Long ownerId, Long id) {
    return FeedbackResponse.from(find(ownerId, id));
  }

  @Transactional
  public FeedbackResponse create(Long ownerId, FeedbackRequest request) {
    Feedback feedback = new Feedback(ownerId);
    apply(feedback, request);
    return FeedbackResponse.from(repository.save(feedback));
  }

  @Transactional
  public FeedbackResponse update(Long ownerId, Long id, FeedbackRequest request) {
    Feedback feedback = find(ownerId, id);
    OptimisticLock.check(request.version(), feedback);
    apply(feedback, request);
    return FeedbackResponse.from(repository.saveAndFlush(feedback));
  }

  @Transactional
  public void delete(Long ownerId, Long id) {
    repository.delete(find(ownerId, id));
  }

  private void apply(Feedback feedback, FeedbackRequest request) {
    entryDatePolicy.validate(feedback.getOwnerId(), request.entryDate());
    feedback.update(
        request.entryDate(), request.subject().trim(), request.type(), request.details().trim());
  }

  private Feedback find(Long ownerId, Long id) {
    return repository
        .findByIdAndOwnerId(id, ownerId)
        .orElseThrow(() -> ApiException.notFound("Feedback not found"));
  }
}
