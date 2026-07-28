package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.TaskCategoryResponse;
import com.workshop.onboardingdiary.entity.TaskCategory;
import com.workshop.onboardingdiary.repository.TaskCategoryRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only access to the Admin-maintained task category list (REQUIREMENTS 4.9); category
 * maintenance is admin work for a later phase.
 */
@Service
public class TaskCategoryService {

    private final TaskCategoryRepository taskCategoryRepository;

    public TaskCategoryService(TaskCategoryRepository taskCategoryRepository) {
        this.taskCategoryRepository = taskCategoryRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskCategoryResponse> list(Boolean active) {
        return taskCategoryRepository.findAll().stream()
                .filter(category -> active == null || category.isActive() == active)
                .sorted(Comparator.comparing(category -> category.getName().toLowerCase()))
                .map(TaskCategoryResponse::from)
                .toList();
    }

    /** Case-insensitive lookup that rejects inactive categories with a field-level error. */
    public TaskCategory resolveActiveCategory(String name) {
        TaskCategory category = taskCategoryRepository.findByNameIgnoreCase(name.trim())
                .orElseThrow(() -> new FieldValidationException("category", "Unknown category"));
        if (!category.isActive()) {
            throw new FieldValidationException("category", "Category is not active");
        }
        return category;
    }
}
