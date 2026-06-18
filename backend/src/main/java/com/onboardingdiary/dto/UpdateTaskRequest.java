package com.onboardingdiary.dto;

import com.onboardingdiary.entity.TaskCategory;
import com.onboardingdiary.entity.TaskPriority;
import com.onboardingdiary.entity.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Request to fully update a task owned by the caller.
 */
public record UpdateTaskRequest(
        @NotNull LocalDate date,
        @NotBlank @Size(min = 1, max = 200) String title,
        @Size(max = 5000) String description,
        @NotNull TaskCategory category,
        @NotNull TaskStatus status,
        @NotNull TaskPriority priority
) {
}
