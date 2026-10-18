package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.checklist.ChecklistDtos.ChecklistDto;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateDto;
import com.codev.onboardingdiary.checklist.ChecklistDtos.TemplateRequest;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.recruit.RecruitService;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Onboarding checklists (extension X1): managers/admins keep a shared template library and assign
 * copies to recruits they can see; recruits tick items off.
 */
@Service
public class ChecklistService {

  private final ChecklistTemplateRepository templates;
  private final RecruitChecklistRepository checklists;
  private final RecruitService recruits;

  public ChecklistService(
      ChecklistTemplateRepository templates,
      RecruitChecklistRepository checklists,
      RecruitService recruits) {
    this.templates = templates;
    this.checklists = checklists;
    this.recruits = recruits;
  }

  @Transactional(readOnly = true)
  public List<TemplateDto> listTemplates() {
    return templates.findAll(Sort.by("name", "id")).stream().map(TemplateDto::of).toList();
  }

  @Transactional
  public TemplateDto createTemplate(User actor, TemplateRequest request) {
    List<String> items = request.items().stream().map(String::trim).toList();
    ChecklistTemplate template =
        new ChecklistTemplate(request.name().trim(), items, actor, Instant.now());
    return TemplateDto.of(templates.save(template));
  }

  @Transactional
  public void deleteTemplate(User actor, Long templateId) {
    ChecklistTemplate template =
        templates
            .findById(templateId)
            .orElseThrow(() -> ApiException.notFound("Template not found"));
    boolean isCreator = template.getCreatedBy().getId().equals(actor.getId());
    if (!actor.hasRole(Role.ADMIN) && !isCreator) {
      throw ApiException.forbidden("Only the creator or an admin can delete this template");
    }
    templates.delete(template);
  }

  @Transactional
  public ChecklistDto assign(User viewer, Long recruitId, Long templateId) {
    User recruit = recruits.requireVisible(viewer, recruitId);
    ChecklistTemplate template =
        templates
            .findById(templateId)
            .orElseThrow(() -> ApiException.fieldError("templateId", "template not found"));
    return ChecklistDto.of(
        checklists.save(new RecruitChecklist(template, recruit, viewer, Instant.now())));
  }

  @Transactional(readOnly = true)
  public List<ChecklistDto> forRecruit(User viewer, Long recruitId) {
    return listOf(recruits.requireVisible(viewer, recruitId));
  }

  @Transactional
  public void unassign(User viewer, Long recruitId, Long checklistId) {
    User recruit = recruits.requireVisible(viewer, recruitId);
    checklists.delete(find(recruit, checklistId));
  }

  @Transactional(readOnly = true)
  public List<ChecklistDto> mine(User recruit) {
    return listOf(recruit);
  }

  @Transactional
  public ChecklistDto setItemDone(User recruit, Long checklistId, Long itemId, boolean done) {
    RecruitChecklist checklist = find(recruit, checklistId);
    checklist
        .findItem(itemId)
        .orElseThrow(() -> ApiException.notFound("Checklist item not found"))
        .markDone(done, Instant.now());
    return ChecklistDto.of(checklists.saveAndFlush(checklist));
  }

  private List<ChecklistDto> listOf(User recruit) {
    return checklists.findByRecruitOrderByAssignedAtAscIdAsc(recruit).stream()
        .map(ChecklistDto::of)
        .toList();
  }

  private RecruitChecklist find(User recruit, Long checklistId) {
    return checklists
        .findByIdAndRecruit(checklistId, recruit)
        .orElseThrow(() -> ApiException.notFound("Checklist not found"));
  }
}
