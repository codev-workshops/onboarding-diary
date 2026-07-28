package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.TaskCategoryResponse;
import com.workshop.onboardingdiary.service.TaskCategoryService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Task category list for any authenticated user (REQUIREMENTS 4.9). */
@RestController
@RequestMapping("/api/categories")
public class TaskCategoryController {

    private final TaskCategoryService taskCategoryService;

    public TaskCategoryController(TaskCategoryService taskCategoryService) {
        this.taskCategoryService = taskCategoryService;
    }

    @GetMapping
    public List<TaskCategoryResponse> list(@RequestParam(name = "active", required = false) Boolean active) {
        return taskCategoryService.list(active == null ? Boolean.TRUE : active);
    }
}
