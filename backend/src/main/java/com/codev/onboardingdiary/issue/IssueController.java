package com.codev.onboardingdiary.issue;

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
@RequestMapping("/api/issues")
public class IssueController {

  private final IssueService service;

  public IssueController(IssueService service) {
    this.service = service;
  }

  @GetMapping
  public PageResponse<IssueResponse> list(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<IssueStatus> status,
      @RequestParam(required = false) List<IssueSeverity> severity,
      @RequestParam(required = false) String q,
      @PageableDefault(size = 20, sort = "entryDate", direction = Sort.Direction.DESC)
          Pageable pageable) {
    return service.list(principal.id(), new IssueFilter(from, to, status, severity, q), pageable);
  }

  @GetMapping("/{id}")
  public IssueResponse get(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    return service.get(principal.id(), id);
  }

  @PostMapping
  public ResponseEntity<IssueResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody IssueRequest request) {
    IssueResponse created = service.create(principal.id(), request);
    return ResponseEntity.created(URI.create("/api/issues/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  public IssueResponse update(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody IssueRequest request) {
    return service.update(principal.id(), id, request);
  }

  @PatchMapping("/{id}/status")
  public IssueResponse changeStatus(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody IssueStatusRequest request) {
    return service.changeStatus(principal.id(), id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    service.delete(principal.id(), id);
    return ResponseEntity.noContent().build();
  }
}
