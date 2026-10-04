package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.common.AuditableEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** A reusable onboarding checklist defined by an admin. */
@Entity
@Table(name = "checklist_templates")
public class ChecklistTemplate extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(length = 1000)
  private String description;

  @ElementCollection
  @CollectionTable(
      name = "checklist_template_items",
      joinColumns = @JoinColumn(name = "template_id"))
  @OrderColumn(name = "sort_order")
  private List<TemplateItem> items = new ArrayList<>();

  public void update(String name, String description, Collection<TemplateItem> items) {
    this.name = name;
    this.description = description;
    this.items.clear();
    this.items.addAll(items);
  }

  public Long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getDescription() {
    return description;
  }

  public List<TemplateItem> getItems() {
    return List.copyOf(items);
  }
}
