package com.codev.onboardingdiary.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Create/update payload. Status defaults to TODO and priority to MEDIUM. */
public record TaskRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 150) String title,
    @Size(max = 5000) String description,
    @NotNull TaskCategory category,
    TaskStatus status,
    TaskPriority priority,
    Integer version) {

  TaskStatus statusOrDefault() {
    return status == null ? TaskStatus.TODO : status;
  }

  TaskPriority priorityOrDefault() {
    return priority == null ? TaskPriority.MEDIUM : priority;
  }
}
