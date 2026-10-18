package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignRequest;
import com.codev.onboardingdiary.checklist.ChecklistDtos.ChecklistDto;
import com.codev.onboardingdiary.checklist.ChecklistDtos.ItemUpdateRequest;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateDto;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateRequest;
import com.codev.onboardingdiary.user.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Checklist endpoints. Role checks live in {@code SecurityConfig}: templates are for managers and
 * admins, {@code /api/checklists} for recruits, {@code /api/recruits/**} for oversight.
 */
@RestController
public class ChecklistController {

  private final ChecklistService service;
  private final CurrentUser currentUser;

  public ChecklistController(ChecklistService service, CurrentUser currentUser) {
    this.service = service;
    this.currentUser = currentUser;
  }

  @GetMapping("/api/checklist-templates")
  List<TemplateDto> templates() {
    return service.listTemplates();
  }

  @PostMapping("/api/checklist-templates")
  ResponseEntity<TemplateDto> createTemplate(@Valid @RequestBody TemplateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.createTemplate(currentUser.get(), request));
  }

  @DeleteMapping("/api/checklist-templates/{id}")
  ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
    service.deleteTemplate(currentUser.get(), id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/api/recruits/{recruitId}/checklists")
  List<ChecklistDto> forRecruit(@PathVariable Long recruitId) {
    return service.forRecruit(currentUser.get(), recruitId);
  }

  @PostMapping("/api/recruits/{recruitId}/checklists")
  ResponseEntity<ChecklistDto> assign(
      @PathVariable Long recruitId, @Valid @RequestBody AssignRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.assign(currentUser.get(), recruitId, request.templateId()));
  }

  @DeleteMapping("/api/recruits/{recruitId}/checklists/{checklistId}")
  ResponseEntity<Void> unassign(@PathVariable Long recruitId, @PathVariable Long checklistId) {
    service.unassign(currentUser.get(), recruitId, checklistId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/api/checklists")
  List<ChecklistDto> mine() {
    return service.mine(currentUser.get());
  }

  @PutMapping("/api/checklists/{checklistId}/items/{itemId}")
  ChecklistDto setItemDone(
      @PathVariable Long checklistId,
      @PathVariable Long itemId,
      @Valid @RequestBody ItemUpdateRequest request) {
    return service.setItemDone(currentUser.get(), checklistId, itemId, request.done());
  }
}
