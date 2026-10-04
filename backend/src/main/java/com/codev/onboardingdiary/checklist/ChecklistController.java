package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignmentResponse;
import com.codev.onboardingdiary.checklist.ChecklistDtos.ItemUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** A recruit's own checklists, and read-only access for their manager. */
@RestController
public class ChecklistController {

  private final ChecklistService service;

  public ChecklistController(ChecklistService service) {
    this.service = service;
  }

  @GetMapping("/api/checklists")
  public List<AssignmentResponse> mine(@AuthenticationPrincipal AuthenticatedUser principal) {
    return service.myChecklists(principal);
  }

  @PatchMapping("/api/checklists/{assignmentId}/items/{itemId}")
  public AssignmentResponse setItem(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long assignmentId,
      @PathVariable Long itemId,
      @Valid @RequestBody ItemUpdateRequest request) {
    return service.setItemCompleted(principal, assignmentId, itemId, request.completed());
  }

  @GetMapping("/api/manager/recruits/{recruitId}/checklists")
  public List<AssignmentResponse> recruitChecklists(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long recruitId) {
    return service.recruitChecklists(principal, recruitId);
  }
}
