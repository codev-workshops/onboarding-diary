package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.TaskRequest;
import com.workshop.onboardingdiary.dto.TaskResponse;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.service.TaskService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Task Log endpoints (REQUIREMENTS 4.2). */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<TaskResponse> list(Principal principal,
                                   @RequestParam(name = "userId", required = false) Long userId,
                                   @RequestParam(name = "dateFrom", required = false)
                                   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                   @RequestParam(name = "dateTo", required = false)
                                   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
                                   @RequestParam(name = "category", required = false) String category,
                                   @RequestParam(name = "status", required = false) TaskStatus status) {
        return taskService.list(principal.getName(), userId, dateFrom, dateTo, category, status);
    }

    @GetMapping("/{id}")
    public TaskResponse get(Principal principal, @PathVariable Long id) {
        return taskService.get(principal.getName(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(Principal principal, @Valid @RequestBody TaskRequest request) {
        return taskService.create(principal.getName(), request);
    }

    @PutMapping("/{id}")
    public TaskResponse update(Principal principal, @PathVariable Long id, @Valid @RequestBody TaskRequest request) {
        return taskService.update(principal.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        taskService.delete(principal.getName(), id);
    }
}
