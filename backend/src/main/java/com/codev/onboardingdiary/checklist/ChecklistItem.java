package com.codev.onboardingdiary.checklist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/** One step of a recruit's checklist. */
@Entity
@Table(name = "checklist_items")
public class ChecklistItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "assignment_id", nullable = false, updatable = false)
  private ChecklistAssignment assignment;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(length = 1000)
  private String description;

  @Column(name = "due_date")
  private LocalDate dueDate;

  @Column(name = "completed_at")
  private Instant completedAt;

  protected ChecklistItem() {}

  ChecklistItem(
      ChecklistAssignment assignment,
      int sortOrder,
      String title,
      String description,
      LocalDate dueDate) {
    this.assignment = assignment;
    this.sortOrder = sortOrder;
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
  }

  /** Marks the item done (keeping the first completion time) or not done. */
  public void setCompleted(boolean completed, Instant now) {
    if (!completed) {
      completedAt = null;
    } else if (completedAt == null) {
      completedAt = now;
    }
  }

  public Long getId() {
    return id;
  }

  public ChecklistAssignment getAssignment() {
    return assignment;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public LocalDate getDueDate() {
    return dueDate;
  }

  public Instant getCompletedAt() {
    return completedAt;
  }
}
