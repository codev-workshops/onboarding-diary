package com.codev.onboardingdiary.web.api;

import com.codev.onboardingdiary.domain.TaskStatus;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.TaskService;
import com.codev.onboardingdiary.web.dto.DtoMapper;
import com.codev.onboardingdiary.web.dto.TaskDto;
import com.codev.onboardingdiary.web.dto.TaskFilter;
import com.codev.onboardingdiary.web.dto.TaskForm;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskApiController {

    private final TaskService taskService;

    public TaskApiController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<TaskDto> list(@AuthenticationPrincipal AppUserDetails principal,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                              @RequestParam(required = false) String category,
                              @RequestParam(required = false) TaskStatus status) {
        return taskService.list(principal, principal.getId(), new TaskFilter(from, to, category, status))
                .stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    public ResponseEntity<TaskDto> create(@AuthenticationPrincipal AppUserDetails principal,
                                          @Valid @RequestBody TaskForm form) {
        return ResponseEntity.status(HttpStatus.CREATED).body(DtoMapper.toDto(taskService.create(principal, form)));
    }

    @GetMapping("/{id}")
    public TaskDto get(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        return DtoMapper.toDto(taskService.getForRead(principal, id));
    }

    @PutMapping("/{id}")
    public TaskDto update(@AuthenticationPrincipal AppUserDetails principal,
                          @PathVariable Long id,
                          @Valid @RequestBody TaskForm form) {
        return DtoMapper.toDto(taskService.update(principal, id, form));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        taskService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
