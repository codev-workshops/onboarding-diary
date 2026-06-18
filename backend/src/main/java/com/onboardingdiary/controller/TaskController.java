package com.onboardingdiary.controller;

import com.onboardingdiary.dto.CreateTaskRequest;
import com.onboardingdiary.dto.PagedResponse;
import com.onboardingdiary.dto.TaskFilter;
import com.onboardingdiary.dto.TaskResponse;
import com.onboardingdiary.dto.UpdateTaskRequest;
import com.onboardingdiary.entity.TaskCategory;
import com.onboardingdiary.entity.TaskPriority;
import com.onboardingdiary.entity.TaskStatus;
import com.onboardingdiary.security.AuthenticatedUser;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/tasks")
@Tag(name = "Task log")
public class TaskController {

    private static final int MAX_PAGE_SIZE = 100;

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    @Operation(summary = "Create a task owned by the authenticated user")
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request) {
        TaskResponse created = taskService.create(CurrentUser.require(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List tasks (recruit: own; manager: own + assigned recruits; admin: all)")
    public PagedResponse<TaskResponse> list(
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskCategory category,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        AuthenticatedUser caller = CurrentUser.require();
        TaskFilter filter = new TaskFilter(ownerId, status, category, priority, dateFrom, dateTo, search);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size),
                Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id")));
        return PagedResponse.from(taskService.list(caller, filter, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a task by id (owner, assigned manager, or admin)")
    public TaskResponse get(@PathVariable Long id) {
        return taskService.get(CurrentUser.require(), id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a task (owner only)")
    public TaskResponse update(@PathVariable Long id, @Valid @RequestBody UpdateTaskRequest request) {
        return taskService.update(CurrentUser.require(), id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a task (owner only)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taskService.delete(CurrentUser.require(), id);
        return ResponseEntity.noContent().build();
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 1;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
