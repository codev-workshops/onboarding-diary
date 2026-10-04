package com.codev.onboardingdiary.task;

import com.codev.onboardingdiary.diary.DiaryEntry;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
public class Task extends DiaryEntry {

  @Column(nullable = false, length = 150)
  private String title;

  @Column(length = 5000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private TaskCategory category;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TaskStatus status;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private TaskPriority priority;

  @Column(name = "completed_at")
  private Instant completedAt;

  protected Task() {}

  public Task(Long ownerId) {
    super(ownerId);
  }

  public void update(
      LocalDate entryDate,
      String title,
      String description,
      TaskCategory category,
      TaskPriority priority) {
    setEntryDate(entryDate);
    this.title = title;
    this.description = description;
    this.category = category;
    this.priority = priority;
  }

  /** Records {@code completedAt} when the task becomes COMPLETED and clears it otherwise. */
  public void changeStatus(TaskStatus newStatus, Instant now) {
    if (newStatus == TaskStatus.COMPLETED && status != TaskStatus.COMPLETED) {
      completedAt = now;
    } else if (newStatus != TaskStatus.COMPLETED) {
      completedAt = null;
    }
    status = newStatus;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public TaskCategory getCategory() {
    return category;
  }

  public TaskStatus getStatus() {
    return status;
  }

  public TaskPriority getPriority() {
    return priority;
  }

  public Instant getCompletedAt() {
    return completedAt;
  }
}
