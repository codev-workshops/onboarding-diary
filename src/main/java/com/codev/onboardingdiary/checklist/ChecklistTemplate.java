package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.user.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Reusable list of onboarding steps that managers and admins assign to recruits. */
@Entity
@Table(name = "checklist_templates")
public class ChecklistTemplate {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 100)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by")
  private User createdBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @ElementCollection
  @CollectionTable(
      name = "checklist_template_items",
      joinColumns = @JoinColumn(name = "template_id"))
  @OrderColumn(name = "item_order")
  @Column(name = "label", nullable = false, length = 200)
  private List<String> items = new ArrayList<>();

  protected ChecklistTemplate() {}

  public ChecklistTemplate(String name, List<String> items, User createdBy, Instant createdAt) {
    this.name = name;
    this.items.addAll(items);
    this.createdBy = createdBy;
    this.createdAt = createdAt;
  }

  public Long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public User getCreatedBy() {
    return createdBy;
  }

  public List<String> getItems() {
    return List.copyOf(items);
  }
}
