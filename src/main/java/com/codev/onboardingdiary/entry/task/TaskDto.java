package com.codev.onboardingdiary.entry.task;

import java.time.Instant;
import java.time.LocalDate;

/** API representation of a task. */
public record TaskDto(
    Long id,
    LocalDate entryDate,
    String title,
    String description,
    TaskCategory category,
    TaskStatus status,
    TaskPriority priority,
    Instant createdAt,
    Instant updatedAt) {

  public static TaskDto of(TaskEntry task) {
    return new TaskDto(
        task.getId(),
        task.getEntryDate(),
        task.getTitle(),
        task.getDescription(),
        task.getCategory(),
        task.getStatus(),
        task.getPriority(),
        task.getCreatedAt(),
        task.getUpdatedAt());
  }
}
