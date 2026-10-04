package com.codev.onboardingdiary.issue;

import static com.codev.onboardingdiary.diary.DiarySpecifications.containsText;
import static com.codev.onboardingdiary.diary.DiarySpecifications.entryDateBetween;
import static com.codev.onboardingdiary.diary.DiarySpecifications.ownedBy;
import static com.codev.onboardingdiary.diary.DiarySpecifications.valueIn;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.diary.DiaryPaging;
import com.codev.onboardingdiary.diary.EntryDatePolicy;
import com.codev.onboardingdiary.diary.OptimisticLock;
import com.codev.onboardingdiary.diary.PageResponse;
import com.codev.onboardingdiary.task.Task;
import com.codev.onboardingdiary.task.TaskRepository;
import java.time.Clock;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IssueService {

  private static final Set<String> SORTS = Set.of("title", "status", "severity");

  private final IssueRepository repository;
  private final TaskRepository taskRepository;
  private final EntryDatePolicy entryDatePolicy;
  private final Clock clock;

  public IssueService(
      IssueRepository repository,
      TaskRepository taskRepository,
      EntryDatePolicy entryDatePolicy,
      Clock clock) {
    this.repository = repository;
    this.taskRepository = taskRepository;
    this.entryDatePolicy = entryDatePolicy;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public PageResponse<IssueResponse> list(Long ownerId, IssueFilter filter, Pageable pageable) {
    Specification<Issue> spec =
        Specification.<Issue>where(ownedBy(ownerId))
            .and(entryDateBetween(filter.from(), filter.to()))
            .and(valueIn("status", filter.status()))
            .and(valueIn("severity", filter.severity()))
            .and(containsText(filter.q(), "title", "description"));
    return PageResponse.from(
        repository.findAll(spec, DiaryPaging.normalize(pageable, SORTS)).map(IssueResponse::from));
  }

  @Transactional(readOnly = true)
  public IssueResponse get(Long ownerId, Long id) {
    return IssueResponse.from(find(ownerId, id));
  }

  @Transactional
  public IssueResponse create(Long ownerId, IssueRequest request) {
    Issue issue = new Issue(ownerId);
    apply(issue, request);
    return IssueResponse.from(repository.save(issue));
  }

  @Transactional
  public IssueResponse update(Long ownerId, Long id, IssueRequest request) {
    Issue issue = find(ownerId, id);
    OptimisticLock.check(request.version(), issue);
    apply(issue, request);
    return IssueResponse.from(repository.saveAndFlush(issue));
  }

  @Transactional
  public IssueResponse changeStatus(Long ownerId, Long id, IssueStatusRequest request) {
    Issue issue = find(ownerId, id);
    changeStatus(issue, request.status(), request.resolutionNotes());
    return IssueResponse.from(repository.saveAndFlush(issue));
  }

  @Transactional
  public void delete(Long ownerId, Long id) {
    repository.delete(find(ownerId, id));
  }

  private void apply(Issue issue, IssueRequest request) {
    entryDatePolicy.validate(issue.getOwnerId(), request.entryDate());
    issue.update(
        request.entryDate(),
        request.title().trim(),
        blankToNull(request.description()),
        request.severity(),
        relatedTask(issue.getOwnerId(), request.relatedTaskId()));
    issue.setResolutionNotes(blankToNull(request.resolutionNotes()));
    changeStatus(issue, request.statusOrDefault(), null);
  }

  private void changeStatus(Issue issue, IssueStatus status, String resolutionNotes) {
    try {
      issue.changeStatus(status, blankToNull(resolutionNotes), clock.instant());
    } catch (Issue.MissingResolutionNotesException ex) {
      throw ApiException.invalidField("resolutionNotes", ex.getMessage());
    }
  }

  private Task relatedTask(Long ownerId, Long taskId) {
    if (taskId == null) {
      return null;
    }
    return taskRepository
        .findByIdAndOwnerId(taskId, ownerId)
        .orElseThrow(() -> ApiException.invalidField("relatedTaskId", "Task not found"));
  }

  private Issue find(Long ownerId, Long id) {
    return repository
        .findByIdAndOwnerId(id, ownerId)
        .orElseThrow(() -> ApiException.notFound("Issue not found"));
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
