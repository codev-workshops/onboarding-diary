package com.onboarding.diary.controller;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.security.SecurityUtils;
import com.onboarding.diary.dto.CreateTaskRequest;
import com.onboarding.diary.dto.TaskFilterParams;
import com.onboarding.diary.dto.TaskResponse;
import com.onboarding.diary.dto.UpdateTaskRequest;
import com.onboarding.diary.entity.TaskCategory;
import com.onboarding.diary.entity.TaskStatus;
import com.onboarding.diary.service.TaskService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        TaskResponse response = taskService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<TaskResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TaskCategory category,
            @RequestParam(required = false) TaskStatus status) {
        String userId = SecurityUtils.getCurrentUserId();
        TaskFilterParams filters = TaskFilterParams.builder()
                .category(category)
                .status(status)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(taskService.list(userId, filters, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getById(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        String role = SecurityUtils.getCurrentUserRole();
        return ResponseEntity.ok(taskService.getById(id, userId, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> update(@PathVariable String id,
            @Valid @RequestBody UpdateTaskRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(taskService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        taskService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<PageResponse<TaskResponse>> listForUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TaskCategory category,
            @RequestParam(required = false) TaskStatus status) {
        String role = SecurityUtils.getCurrentUserRole();
        if (!"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Only managers and admins can view other users' tasks");
        }
        TaskFilterParams filters = TaskFilterParams.builder()
                .category(category)
                .status(status)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(taskService.listForUser(userId, filters, pageable));
    }

    @GetMapping("/internal/user/{userId}")
    public ResponseEntity<List<TaskResponse>> getTasksInRange(
            @PathVariable String userId,
            @RequestParam String dateFrom,
            @RequestParam String dateTo) {
        return ResponseEntity.ok(taskService.getTasksInRange(userId, dateFrom, dateTo));
    }
}
