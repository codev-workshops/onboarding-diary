package com.codev.onboardingdiary.task;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.diary.PageResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

  private final TaskService service;

  public TaskController(TaskService service) {
    this.service = service;
  }

  @GetMapping
  public PageResponse<TaskResponse> list(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<TaskCategory> category,
      @RequestParam(required = false) List<TaskStatus> status,
      @RequestParam(required = false) TaskPriority priority,
      @RequestParam(required = false) String q,
      @PageableDefault(size = 20, sort = "entryDate", direction = Sort.Direction.DESC)
          Pageable pageable) {
    return service.list(
        principal.id(), new TaskFilter(from, to, category, status, priority, q), pageable);
  }

  @GetMapping("/{id}")
  public TaskResponse get(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    return service.get(principal.id(), id);
  }

  @PostMapping
  public ResponseEntity<TaskResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody TaskRequest request) {
    TaskResponse created = service.create(principal.id(), request);
    return ResponseEntity.created(URI.create("/api/tasks/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  public TaskResponse update(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody TaskRequest request) {
    return service.update(principal.id(), id, request);
  }

  @PatchMapping("/{id}/status")
  public TaskResponse changeStatus(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody TaskStatusRequest request) {
    return service.changeStatus(principal.id(), id, request.status());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    service.delete(principal.id(), id);
    return ResponseEntity.noContent().build();
  }
}
