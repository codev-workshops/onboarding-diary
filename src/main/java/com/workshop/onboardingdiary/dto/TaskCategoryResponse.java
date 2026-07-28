package com.workshop.onboardingdiary.dto;

import com.workshop.onboardingdiary.entity.TaskCategory;

public record TaskCategoryResponse(Long id, String name, boolean active) {

    public static TaskCategoryResponse from(TaskCategory category) {
        return new TaskCategoryResponse(category.getId(), category.getName(), category.isActive());
    }
}
