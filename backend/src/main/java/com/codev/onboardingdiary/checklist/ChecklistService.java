package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.audit.AuditAction;
import com.codev.onboardingdiary.audit.AuditLogService;
import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignResult;
import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignmentResponse;
import com.codev.onboardingdiary.checklist.ChecklistDtos.AssignmentSummary;
import com.codev.onboardingdiary.checklist.ChecklistDtos.ItemResponse;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateItemDto;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateRequest;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateResponse;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.manager.RecruitAccess;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.Role;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Checklist templates (admin), assignment to recruits, and item completion. */
@Service
public class ChecklistService {

  private final ChecklistTemplateRepository templateRepository;
  private final ChecklistAssignmentRepository assignmentRepository;
  private final ChecklistItemRepository itemRepository;
  private final ProfileRepository profileRepository;
  private final RecruitAccess recruitAccess;
  private final AuditLogService auditLogService;
  private final Clock clock;

  public ChecklistService(
      ChecklistTemplateRepository templateRepository,
      ChecklistAssignmentRepository assignmentRepository,
      ChecklistItemRepository itemRepository,
      ProfileRepository profileRepository,
      RecruitAccess recruitAccess,
      AuditLogService auditLogService,
      Clock clock) {
    this.templateRepository = templateRepository;
    this.assignmentRepository = assignmentRepository;
    this.itemRepository = itemRepository;
    this.profileRepository = profileRepository;
    this.recruitAccess = recruitAccess;
    this.auditLogService = auditLogService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<TemplateResponse> listTemplates() {
    return templateRepository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public TemplateResponse getTemplate(Long id) {
    return toResponse(template(id));
  }

  @Transactional
  public TemplateResponse createTemplate(AuthenticatedUser actor, TemplateRequest request) {
    String name = request.name().strip();
    if (templateRepository.existsByNameIgnoreCase(name)) {
      throw duplicateName();
    }
    ChecklistTemplate template = new ChecklistTemplate();
    template.update(name, blankToNull(request.description()), items(request));
    templateRepository.saveAndFlush(template);
    audit(actor, AuditAction.CHECKLIST_TEMPLATE_SAVED, null, template.getName());
    return toResponse(template);
  }

  @Transactional
  public TemplateResponse updateTemplate(
      AuthenticatedUser actor, Long id, TemplateRequest request) {
    ChecklistTemplate template = template(id);
    if (request.version() != null && request.version() != template.getVersion()) {
      throw ApiException.conflict("This checklist was changed by someone else. Reload and retry.");
    }
    String name = request.name().strip();
    if (templateRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw duplicateName();
    }
    template.update(name, blankToNull(request.description()), items(request));
    templateRepository.saveAndFlush(template);
    audit(actor, AuditAction.CHECKLIST_TEMPLATE_SAVED, null, template.getName());
    return toResponse(template);
  }

  /** Deletes a template; checklists already assigned from it are kept. */
  @Transactional
  public void deleteTemplate(AuthenticatedUser actor, Long id) {
    ChecklistTemplate template = template(id);
    String name = template.getName();
    assignmentRepository.detachTemplate(id);
    templateRepository.deleteById(id);
    audit(actor, AuditAction.CHECKLIST_TEMPLATE_DELETED, null, name);
  }

  @Transactional
  public AssignResult assign(AuthenticatedUser actor, Long templateId, List<Long> recruitIds) {
    ChecklistTemplate template = template(templateId);
    List<Profile> recruits = new ArrayList<>();
    for (Long recruitId : new LinkedHashSet<>(recruitIds)) {
      Profile profile = profileRepository.findById(recruitId).orElse(null);
      if (profile == null || !profile.getUser().getRoles().contains(Role.RECRUIT)) {
        throw ApiException.invalidField("recruitIds", "User " + recruitId + " is not a recruit");
      }
      recruits.add(profile);
    }
    List<Long> assigned = new ArrayList<>();
    List<Long> skipped = new ArrayList<>();
    for (Profile recruit : recruits) {
      Long recruitId = recruit.getUserId();
      if (assignmentRepository.existsByRecruitIdAndTemplateId(recruitId, templateId)) {
        skipped.add(recruitId);
        continue;
      }
      assignmentRepository.save(
          new ChecklistAssignment(recruitId, template, actor.id(), recruit.getStartDate()));
      audit(actor, AuditAction.CHECKLIST_ASSIGNED, recruitId, template.getName());
      assigned.add(recruitId);
    }
    return new AssignResult(assigned, skipped);
  }

  @Transactional(readOnly = true)
  public List<AssignmentSummary> templateAssignments(Long templateId) {
    template(templateId);
    return assignmentRepository.findByTemplateIdOrderByIdAsc(templateId).stream()
        .map(
            assignment -> {
              AssignmentResponse full = toResponse(assignment);
              return new AssignmentSummary(
                  assignment.getId(),
                  assignment.getRecruitId(),
                  profileRepository.findFullNameByUserId(assignment.getRecruitId()).orElse(null),
                  full.totalItems(),
                  full.completedItems(),
                  full.completionPct());
            })
        .toList();
  }

  @Transactional
  public void unassign(AuthenticatedUser actor, Long assignmentId) {
    ChecklistAssignment assignment =
        assignmentRepository
            .findById(assignmentId)
            .orElseThrow(() -> ApiException.notFound("Checklist not found"));
    assignmentRepository.delete(assignment);
    audit(actor, AuditAction.CHECKLIST_UNASSIGNED, assignment.getRecruitId(), assignment.getName());
  }

  @Transactional(readOnly = true)
  public List<AssignmentResponse> myChecklists(AuthenticatedUser viewer) {
    return checklistsOf(viewer.id());
  }

  @Transactional(readOnly = true)
  public List<AssignmentResponse> recruitChecklists(AuthenticatedUser viewer, Long recruitId) {
    recruitAccess.require(viewer, recruitId);
    return checklistsOf(recruitId);
  }

  /** Ticks or unticks one of the caller's own checklist items; 404 for anyone else's. */
  @Transactional
  public AssignmentResponse setItemCompleted(
      AuthenticatedUser viewer, Long assignmentId, Long itemId, boolean completed) {
    ChecklistItem item =
        itemRepository
            .findByIdAndAssignment_IdAndAssignment_RecruitId(itemId, assignmentId, viewer.id())
            .orElseThrow(() -> ApiException.notFound("Checklist item not found"));
    item.setCompleted(completed, Instant.now(clock));
    itemRepository.flush();
    return toResponse(item.getAssignment());
  }

  private List<AssignmentResponse> checklistsOf(Long recruitId) {
    return assignmentRepository.findByRecruitIdOrderByCreatedAtAscIdAsc(recruitId).stream()
        .map(this::toResponse)
        .toList();
  }

  private ChecklistTemplate template(Long id) {
    return templateRepository
        .findById(id)
        .orElseThrow(() -> ApiException.notFound("Checklist template not found"));
  }

  private static List<TemplateItem> items(TemplateRequest request) {
    return request.items().stream()
        .map(
            item ->
                new TemplateItem(
                    item.title().strip(), blankToNull(item.description()), item.dueDayOffset()))
        .toList();
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private static ApiException duplicateName() {
    return ApiException.conflict("A checklist template with this name already exists");
  }

  private void audit(AuthenticatedUser actor, AuditAction action, Long target, String name) {
    auditLogService.record(actor.id(), action, target, Map.of("checklist", name));
  }

  private TemplateResponse toResponse(ChecklistTemplate template) {
    return new TemplateResponse(
        template.getId(),
        template.getName(),
        template.getDescription(),
        template.getItems().stream()
            .map(
                item ->
                    new TemplateItemDto(
                        item.getTitle(), item.getDescription(), item.getDueDayOffset()))
            .toList(),
        assignmentRepository.countByTemplateId(template.getId()),
        template.getUpdatedAt(),
        template.getVersion());
  }

  private AssignmentResponse toResponse(ChecklistAssignment assignment) {
    LocalDate today = LocalDate.now(clock);
    List<ItemResponse> items =
        assignment.getItems().stream()
            .map(
                item ->
                    new ItemResponse(
                        item.getId(),
                        item.getTitle(),
                        item.getDescription(),
                        item.getDueDate(),
                        item.getCompletedAt(),
                        item.getCompletedAt() == null
                            && item.getDueDate() != null
                            && item.getDueDate().isBefore(today)))
            .toList();
    int done = (int) items.stream().filter(item -> item.completedAt() != null).count();
    double pct = items.isEmpty() ? 0 : Math.round(done * 1000.0 / items.size()) / 10.0;
    return new AssignmentResponse(
        assignment.getId(),
        assignment.getTemplateId(),
        assignment.getName(),
        assignment.getCreatedAt(),
        items.size(),
        done,
        pct,
        items);
  }
}
