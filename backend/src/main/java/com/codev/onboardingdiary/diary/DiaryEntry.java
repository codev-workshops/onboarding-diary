package com.codev.onboardingdiary.diary;

import com.codev.onboardingdiary.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDate;

/** Fields shared by every diary entry: identity, owner and the day the entry is about. */
@MappedSuperclass
public abstract class DiaryEntry extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "owner_id", nullable = false, updatable = false)
  private Long ownerId;

  @Column(name = "entry_date", nullable = false)
  private LocalDate entryDate;

  protected DiaryEntry() {}

  protected DiaryEntry(Long ownerId) {
    this.ownerId = ownerId;
  }

  public Long getId() {
    return id;
  }

  public Long getOwnerId() {
    return ownerId;
  }

  public LocalDate getEntryDate() {
    return entryDate;
  }

  protected void setEntryDate(LocalDate entryDate) {
    this.entryDate = entryDate;
  }
}
