package com.codev.onboardingdiary.entry.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Create/update payload for a task. */
public record TaskRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 120) String title,
    @Size(max = 4000) String description,
    @NotNull TaskCategory category,
    @NotNull TaskStatus status,
    @NotNull TaskPriority priority) {}
