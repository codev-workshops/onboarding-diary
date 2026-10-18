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

/** One step of a recruit checklist. */
@Entity
@Table(name = "recruit_checklist_items")
public class RecruitChecklistItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "checklist_id")
  private RecruitChecklist checklist;

  @Column(name = "item_order", nullable = false)
  private int itemOrder;

  @Column(nullable = false, length = 200)
  private String label;

  @Column(nullable = false)
  private boolean done;

  @Column(name = "done_at")
  private Instant doneAt;

  protected RecruitChecklistItem() {}

  RecruitChecklistItem(RecruitChecklist checklist, int itemOrder, String label) {
    this.checklist = checklist;
    this.itemOrder = itemOrder;
    this.label = label;
  }

  public void markDone(boolean newDone, Instant now) {
    if (newDone && !done) {
      doneAt = now;
    } else if (!newDone) {
      doneAt = null;
    }
    done = newDone;
  }

  public Long getId() {
    return id;
  }

  public String getLabel() {
    return label;
  }

  public boolean isDone() {
    return done;
  }

  public Instant getDoneAt() {
    return doneAt;
  }
}
