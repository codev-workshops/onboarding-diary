package com.onboardingdiary.controller;

import com.onboardingdiary.dto.FeedbackEntryRequest;
import com.onboardingdiary.entity.FeedbackEntry;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.service.FeedbackEntryService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackEntryController {

    private final FeedbackEntryService feedbackEntryService;
    private final UserRepository userRepository;

    public FeedbackEntryController(FeedbackEntryService feedbackEntryService, UserRepository userRepository) {
        this.feedbackEntryService = feedbackEntryService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<FeedbackEntry> create(@AuthenticationPrincipal UserDetails userDetails,
                                                 @Valid @RequestBody FeedbackEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(feedbackEntryService.create(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<FeedbackEntry>> list(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String type) {
        User user = getUser(userDetails);
        if (user.getRole() == Role.MANAGER || user.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(feedbackEntryService.getAll(dateFrom, dateTo, type));
        }
        return ResponseEntity.ok(feedbackEntryService.getByUser(user.getId(), dateFrom, dateTo, type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeedbackEntry> getById(@PathVariable Long id) {
        return ResponseEntity.ok(feedbackEntryService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FeedbackEntry> update(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable Long id,
                                                 @Valid @RequestBody FeedbackEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(feedbackEntryService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails userDetails,
                                        @PathVariable Long id) {
        Long userId = getUserId(userDetails);
        feedbackEntryService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    private User getUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Long getUserId(UserDetails userDetails) {
        return getUser(userDetails).getId();
    }
}
