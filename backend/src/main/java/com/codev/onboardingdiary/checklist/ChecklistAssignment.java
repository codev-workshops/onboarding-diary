package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.common.AuditableEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.BatchSize;

/**
 * A checklist assigned to a recruit. Items are copied from the template at assignment time, so
 * later template edits do not change checklists already in progress.
 */
@Entity
@Table(name = "checklist_assignments")
public class ChecklistAssignment extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "recruit_id", nullable = false, updatable = false)
  private Long recruitId;

  @Column(name = "template_id")
  private Long templateId;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(name = "assigned_by", nullable = false, updatable = false)
  private Long assignedBy;

  @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder ASC")
  @BatchSize(size = 50)
  private List<ChecklistItem> items = new ArrayList<>();

  protected ChecklistAssignment() {}

  /** Copies the template's items; due dates are the start date plus each item's offset. */
  public ChecklistAssignment(
      Long recruitId, ChecklistTemplate template, Long assignedBy, LocalDate startDate) {
    this.recruitId = recruitId;
    this.templateId = template.getId();
    this.name = template.getName();
    this.assignedBy = assignedBy;
    int order = 0;
    for (TemplateItem item : template.getItems()) {
      LocalDate due =
          item.getDueDayOffset() == null || startDate == null
              ? null
              : startDate.plusDays(item.getDueDayOffset());
      items.add(new ChecklistItem(this, order++, item.getTitle(), item.getDescription(), due));
    }
  }

  public Long getId() {
    return id;
  }

  public Long getRecruitId() {
    return recruitId;
  }

  public Long getTemplateId() {
    return templateId;
  }

  public String getName() {
    return name;
  }

  public List<ChecklistItem> getItems() {
    return List.copyOf(items);
  }
}
