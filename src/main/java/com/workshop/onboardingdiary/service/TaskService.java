package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.TaskRequest;
import com.workshop.onboardingdiary.dto.TaskResponse;
import com.workshop.onboardingdiary.entity.TaskCategory;
import com.workshop.onboardingdiary.entity.TaskEntry;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.TaskCategoryRepository;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Task Log CRUD, filters and ownership rules (REQUIREMENTS 4.2, US-R04, US-R05). */
@Service
public class TaskService {

    private final TaskEntryRepository taskEntryRepository;
    private final TaskCategoryRepository taskCategoryRepository;
    private final TaskCategoryService taskCategoryService;
    private final EntryAccessService access;

    public TaskService(TaskEntryRepository taskEntryRepository,
                       TaskCategoryRepository taskCategoryRepository,
                       TaskCategoryService taskCategoryService,
                       EntryAccessService access) {
        this.taskEntryRepository = taskEntryRepository;
        this.taskCategoryRepository = taskCategoryRepository;
        this.taskCategoryService = taskCategoryService;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list(String callerEmail, Long userId, LocalDate dateFrom, LocalDate dateTo,
                                   String category, TaskStatus status) {
        User caller = access.requireUser(callerEmail);
        User owner = access.resolveListTarget(caller, userId);
        Long categoryId = category == null || category.isBlank() ? null
                : taskCategoryRepository.findByNameIgnoreCase(category.trim())
                        .map(TaskCategory::getId)
                        .orElseThrow(() -> new FieldValidationException("category", "Unknown category"));
        return taskEntryRepository.search(owner.getId(), dateFrom, dateTo, categoryId, status).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse get(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        TaskEntry task = require(id);
        access.requireReadAccess(caller, task.getOwner());
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse create(String callerEmail, TaskRequest request) {
        User caller = access.requireUser(callerEmail);
        TaskCategory category = taskCategoryService.resolveActiveCategory(request.category());
        access.validateEntryDate(request.entryDate(), caller);

        TaskEntry task = new TaskEntry();
        task.setOwner(caller);
        apply(task, request, category);
        return TaskResponse.from(taskEntryRepository.save(task));
    }

    @Transactional
    public TaskResponse update(String callerEmail, Long id, TaskRequest request) {
        User caller = access.requireUser(callerEmail);
        TaskEntry task = require(id);
        access.requireWriteAccess(caller, task.getOwner());
        TaskCategory category = taskCategoryService.resolveActiveCategory(request.category());
        access.validateEntryDate(request.entryDate(), task.getOwner());

        apply(task, request, category);
        return TaskResponse.from(taskEntryRepository.save(task));
    }

    @Transactional
    public void delete(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        TaskEntry task = require(id);
        access.requireWriteAccess(caller, task.getOwner());
        taskEntryRepository.delete(task);
    }

    private void apply(TaskEntry task, TaskRequest request, TaskCategory category) {
        task.setEntryDate(request.entryDate());
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setCategory(category);
        task.setStatus(request.status());
        task.setPriority(request.priority());
    }

    private TaskEntry require(Long id) {
        return taskEntryRepository.findById(id)
                .orElseThrow(() -> new EntryNotFoundException("Task " + id + " was not found"));
    }
}
