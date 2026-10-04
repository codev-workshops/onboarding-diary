package com.codev.onboardingdiary.task;

import static com.codev.onboardingdiary.diary.DiarySpecifications.containsText;
import static com.codev.onboardingdiary.diary.DiarySpecifications.entryDateBetween;
import static com.codev.onboardingdiary.diary.DiarySpecifications.ownedBy;
import static com.codev.onboardingdiary.diary.DiarySpecifications.valueIn;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.diary.DiaryPaging;
import com.codev.onboardingdiary.diary.EntryDatePolicy;
import com.codev.onboardingdiary.diary.OptimisticLock;
import com.codev.onboardingdiary.diary.PageResponse;
import java.time.Clock;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

  private static final Set<String> SORTS = Set.of("title", "status", "priority", "category");

  private final TaskRepository repository;
  private final EntryDatePolicy entryDatePolicy;
  private final Clock clock;

  public TaskService(TaskRepository repository, EntryDatePolicy entryDatePolicy, Clock clock) {
    this.repository = repository;
    this.entryDatePolicy = entryDatePolicy;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public PageResponse<TaskResponse> list(Long ownerId, TaskFilter filter, Pageable pageable) {
    Specification<Task> spec =
        Specification.<Task>where(ownedBy(ownerId))
            .and(entryDateBetween(filter.from(), filter.to()))
            .and(valueIn("category", filter.category()))
            .and(valueIn("status", filter.status()))
            .and(valueIn("priority", filter.priority() == null ? null : List.of(filter.priority())))
            .and(containsText(filter.q(), "title"));
    return PageResponse.from(
        repository.findAll(spec, DiaryPaging.normalize(pageable, SORTS)).map(TaskResponse::from));
  }

  @Transactional(readOnly = true)
  public TaskResponse get(Long ownerId, Long id) {
    return TaskResponse.from(find(ownerId, id));
  }

  @Transactional
  public TaskResponse create(Long ownerId, TaskRequest request) {
    Task task = new Task(ownerId);
    apply(task, request);
    return TaskResponse.from(repository.save(task));
  }

  @Transactional
  public TaskResponse update(Long ownerId, Long id, TaskRequest request) {
    Task task = find(ownerId, id);
    OptimisticLock.check(request.version(), task);
    apply(task, request);
    return TaskResponse.from(repository.saveAndFlush(task));
  }

  @Transactional
  public TaskResponse changeStatus(Long ownerId, Long id, TaskStatus status) {
    Task task = find(ownerId, id);
    task.changeStatus(status, clock.instant());
    return TaskResponse.from(repository.saveAndFlush(task));
  }

  @Transactional
  public void delete(Long ownerId, Long id) {
    repository.delete(find(ownerId, id));
  }

  private void apply(Task task, TaskRequest request) {
    entryDatePolicy.validate(task.getOwnerId(), request.entryDate());
    task.update(
        request.entryDate(),
        request.title().trim(),
        blankToNull(request.description()),
        request.category(),
        request.priorityOrDefault());
    task.changeStatus(request.statusOrDefault(), clock.instant());
  }

  private Task find(Long ownerId, Long id) {
    return repository
        .findByIdAndOwnerId(id, ownerId)
        .orElseThrow(() -> ApiException.notFound("Task not found"));
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
