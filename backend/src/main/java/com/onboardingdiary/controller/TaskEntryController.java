package com.onboardingdiary.controller;

import com.onboardingdiary.dto.TaskEntryRequest;
import com.onboardingdiary.entity.TaskEntry;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.service.TaskEntryService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskEntryController {

    private final TaskEntryService taskEntryService;
    private final UserRepository userRepository;

    public TaskEntryController(TaskEntryService taskEntryService, UserRepository userRepository) {
        this.taskEntryService = taskEntryService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<TaskEntry> create(@AuthenticationPrincipal UserDetails userDetails,
                                             @Valid @RequestBody TaskEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(taskEntryService.create(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<TaskEntry>> list(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(taskEntryService.getByUser(userId, dateFrom, dateTo, category, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskEntry> getById(@PathVariable Long id) {
        return ResponseEntity.ok(taskEntryService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskEntry> update(@AuthenticationPrincipal UserDetails userDetails,
                                             @PathVariable Long id,
                                             @Valid @RequestBody TaskEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(taskEntryService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails userDetails,
                                        @PathVariable Long id) {
        Long userId = getUserId(userDetails);
        taskEntryService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
