package com.codev.onboardingdiary.entry.task;

import static com.codev.onboardingdiary.entry.EntrySpecs.attributeEquals;
import static com.codev.onboardingdiary.entry.EntrySpecs.dateBetween;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.DateRules;
import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Texts;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.user.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Task log use cases. All operations are scoped to the given owner. */
@Service
public class TaskService {

  private final TaskRepository repository;
  private final DateRules dateRules;

  public TaskService(TaskRepository repository, DateRules dateRules) {
    this.repository = repository;
    this.dateRules = dateRules;
  }

  @Transactional(readOnly = true)
  public PageResponse<TaskDto> list(User owner, TaskFilter filter, Pageable pageable) {
    DateRules.requireValidRange(filter.from(), filter.to());
    Specification<TaskEntry> spec =
        Specification.where(EntrySpecs.<TaskEntry>ownedBy(owner))
            .and(dateBetween(filter.from(), filter.to()))
            .and(attributeEquals("category", filter.category()))
            .and(attributeEquals("status", filter.status()));
    return PageResponse.of(repository.findAll(spec, pageable), TaskDto::of);
  }

  @Transactional(readOnly = true)
  public TaskDto get(User owner, Long id) {
    return TaskDto.of(find(owner, id));
  }

  @Transactional
  public TaskDto create(User owner, TaskRequest request) {
    TaskEntry task = new TaskEntry(owner);
    apply(task, request);
    return TaskDto.of(repository.save(task));
  }

  @Transactional
  public TaskDto update(User owner, Long id, TaskRequest request) {
    TaskEntry task = find(owner, id);
    apply(task, request);
    return TaskDto.of(repository.saveAndFlush(task));
  }

  @Transactional
  public void delete(User owner, Long id) {
    repository.delete(find(owner, id));
  }

  private TaskEntry find(User owner, Long id) {
    return repository
        .findByIdAndOwner(id, owner)
        .orElseThrow(() -> ApiException.notFound("Task not found"));
  }

  private void apply(TaskEntry task, TaskRequest request) {
    dateRules.requireNotAfter(
        request.entryDate(),
        dateRules.today().plusYears(1),
        "entryDate",
        "must not be more than 1 year in the future");
    task.setEntryDate(request.entryDate());
    task.setTitle(request.title());
    task.setDescription(Texts.trimToNull(request.description()));
    task.setCategory(request.category());
    task.setStatus(request.status());
    task.setPriority(request.priority());
  }

}
