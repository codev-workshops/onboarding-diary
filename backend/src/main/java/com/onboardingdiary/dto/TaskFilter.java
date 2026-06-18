package com.onboardingdiary.dto;

import com.onboardingdiary.entity.TaskCategory;
import com.onboardingdiary.entity.TaskPriority;
import com.onboardingdiary.entity.TaskStatus;

import java.time.LocalDate;

/**
 * Optional filters applied to a task listing. Any null field is ignored.
 */
public record TaskFilter(
        Long ownerId,
        TaskStatus status,
        TaskCategory category,
        TaskPriority priority,
        LocalDate dateFrom,
        LocalDate dateTo,
        String search
) {
}
