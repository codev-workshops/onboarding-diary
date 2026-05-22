package com.onboardingdiary.controller;

import com.onboardingdiary.dto.request.TaskRequest;
import com.onboardingdiary.dto.response.TaskResponse;
import com.onboardingdiary.enums.TaskCategory;
import com.onboardingdiary.enums.TaskStatus;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<TaskResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(principal.getId(), request));
    }

    @GetMapping
    public ResponseEntity<Page<TaskResponse>> list(@AuthenticationPrincipal UserPrincipal principal,
                                                    @RequestParam(required = false) LocalDate dateFrom,
                                                    @RequestParam(required = false) LocalDate dateTo,
                                                    @RequestParam(required = false) TaskCategory category,
                                                    @RequestParam(required = false) TaskStatus status,
                                                    @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(taskService.list(principal.getId(), dateFrom, dateTo, category, status, pageable));
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<TaskResponse> getById(@AuthenticationPrincipal UserPrincipal principal,
                                                 @PathVariable UUID taskId) {
        return ResponseEntity.ok(taskService.getById(taskId, principal.getId(), principal.getRole()));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<TaskResponse> update(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable UUID taskId,
                                                @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.update(taskId, principal.getId(), request));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable UUID taskId) {
        taskService.delete(taskId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<Page<TaskResponse>> listForUser(@PathVariable UUID userId,
                                                           @RequestParam(required = false) LocalDate dateFrom,
                                                           @RequestParam(required = false) LocalDate dateTo,
                                                           @RequestParam(required = false) TaskCategory category,
                                                           @RequestParam(required = false) TaskStatus status,
                                                           @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(taskService.list(userId, dateFrom, dateTo, category, status, pageable));
    }
}
