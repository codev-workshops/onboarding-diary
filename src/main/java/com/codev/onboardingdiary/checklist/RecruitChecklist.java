package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** A recruit's copy of a template; later template changes do not affect it. */
@Entity
@Table(name = "recruit_checklists")
public class RecruitChecklist {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "recruit_id")
  private User recruit;

  @Column(nullable = false, length = 100)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "assigned_by")
  private User assignedBy;

  @Column(name = "assigned_at", nullable = false)
  private Instant assignedAt;

  @OneToMany(mappedBy = "checklist", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("itemOrder")
  private List<RecruitChecklistItem> items = new ArrayList<>();

  protected RecruitChecklist() {}

  public RecruitChecklist(ChecklistTemplate template, User recruit, User assignedBy, Instant now) {
    this.recruit = recruit;
    this.name = template.getName();
    this.assignedBy = assignedBy;
    this.assignedAt = now;
    List<String> labels = template.getItems();
    for (int i = 0; i < labels.size(); i++) {
      items.add(new RecruitChecklistItem(this, i, labels.get(i)));
    }
  }

  public Optional<RecruitChecklistItem> findItem(Long itemId) {
    return items.stream().filter(item -> item.getId().equals(itemId)).findFirst();
  }

  public Long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public User getAssignedBy() {
    return assignedBy;
  }

  public Instant getAssignedAt() {
    return assignedAt;
  }

  public List<RecruitChecklistItem> getItems() {
    return List.copyOf(items);
  }
}
