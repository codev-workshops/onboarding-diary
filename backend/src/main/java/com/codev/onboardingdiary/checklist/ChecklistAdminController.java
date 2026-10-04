package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignRequest;
import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignResult;
import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignmentSummary;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateRequest;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Checklist templates and assignments (ADMIN only, enforced for /api/admin/**). */
@RestController
@RequestMapping("/api/admin/checklists")
public class ChecklistAdminController {

  private final ChecklistService service;

  public ChecklistAdminController(ChecklistService service) {
    this.service = service;
  }

  @GetMapping("/templates")
  public List<TemplateResponse> list() {
    return service.listTemplates();
  }

  @GetMapping("/templates/{id}")
  public TemplateResponse get(@PathVariable Long id) {
    return service.getTemplate(id);
  }

  @PostMapping("/templates")
  public ResponseEntity<TemplateResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody TemplateRequest request) {
    TemplateResponse created = service.createTemplate(principal, request);
    return ResponseEntity.created(URI.create("/api/admin/checklists/templates/" + created.id()))
        .body(created);
  }

  @PutMapping("/templates/{id}")
  public TemplateResponse update(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody TemplateRequest request) {
    return service.updateTemplate(principal, id, request);
  }

  @DeleteMapping("/templates/{id}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    service.deleteTemplate(principal, id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/templates/{id}/assignments")
  public List<AssignmentSummary> assignments(@PathVariable Long id) {
    return service.templateAssignments(id);
  }

  @PostMapping("/templates/{id}/assignments")
  public AssignResult assign(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody AssignRequest request) {
    return service.assign(principal, id, request.recruitIds());
  }

  @DeleteMapping("/assignments/{id}")
  public ResponseEntity<Void> unassign(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    service.unassign(principal, id);
    return ResponseEntity.noContent().build();
  }
}
