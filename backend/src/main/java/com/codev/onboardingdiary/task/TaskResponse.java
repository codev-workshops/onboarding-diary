package com.codev.onboardingdiary.task;

import java.time.Instant;
import java.time.LocalDate;

public record TaskResponse(
    Long id,
    LocalDate entryDate,
    String title,
    String description,
    TaskCategory category,
    TaskStatus status,
    TaskPriority priority,
    Instant completedAt,
    Instant createdAt,
    Instant updatedAt,
    int version) {

  public static TaskResponse from(Task task) {
    return new TaskResponse(
        task.getId(),
        task.getEntryDate(),
        task.getTitle(),
        task.getDescription(),
        task.getCategory(),
        task.getStatus(),
        task.getPriority(),
        task.getCompletedAt(),
        task.getCreatedAt(),
        task.getUpdatedAt(),
        task.getVersion());
  }
}
