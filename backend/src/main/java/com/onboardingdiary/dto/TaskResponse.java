package com.onboardingdiary.dto;

import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.TaskCategory;
import com.onboardingdiary.entity.TaskPriority;
import com.onboardingdiary.entity.TaskStatus;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Public projection of a task.
 */
public record TaskResponse(
        Long id,
        Long ownerId,
        LocalDate date,
        String title,
        String description,
        TaskCategory category,
        TaskStatus status,
        TaskPriority priority,
        Instant createdAt,
        Instant updatedAt
) {
    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getOwnerId(),
                task.getDate(),
                task.getTitle(),
                task.getDescription(),
                task.getCategory(),
                task.getStatus(),
                task.getPriority(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
