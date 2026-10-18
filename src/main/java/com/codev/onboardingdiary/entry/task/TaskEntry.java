package com.codev.onboardingdiary.entry.task;

import com.codev.onboardingdiary.entry.EntryBase;
import com.codev.onboardingdiary.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/** A task the recruit worked on. */
@Entity
@Table(name = "task_entries")
public class TaskEntry extends EntryBase {

  @Column(nullable = false, length = 120)
  private String title;

  @Column(length = 4000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TaskCategory category;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TaskStatus status;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private TaskPriority priority;

  protected TaskEntry() {}

  public TaskEntry(User owner) {
    super(owner);
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public TaskCategory getCategory() {
    return category;
  }

  public void setCategory(TaskCategory category) {
    this.category = category;
  }

  public TaskStatus getStatus() {
    return status;
  }

  public void setStatus(TaskStatus status) {
    this.status = status;
  }

  public TaskPriority getPriority() {
    return priority;
  }

  public void setPriority(TaskPriority priority) {
    this.priority = priority;
  }
}
