package com.onboardingdiary.controller;

import com.onboardingdiary.dto.request.FeedbackRequest;
import com.onboardingdiary.dto.response.FeedbackResponse;
import com.onboardingdiary.enums.FeedbackType;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.FeedbackService;
import com.onboardingdiary.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<FeedbackResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                     @Valid @RequestBody FeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(feedbackService.create(principal.getId(), request));
    }

    @GetMapping
    public ResponseEntity<Page<FeedbackResponse>> list(@AuthenticationPrincipal UserPrincipal principal,
                                                        @RequestParam(required = false) LocalDate dateFrom,
                                                        @RequestParam(required = false) LocalDate dateTo,
                                                        @RequestParam(required = false) FeedbackType type,
                                                        @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(feedbackService.list(principal.getId(), dateFrom, dateTo, type, pageable));
    }

    @GetMapping("/{feedbackId}")
    public ResponseEntity<FeedbackResponse> getById(@AuthenticationPrincipal UserPrincipal principal,
                                                      @PathVariable UUID feedbackId) {
        return ResponseEntity.ok(feedbackService.getById(feedbackId, principal.getId(), principal.getRole()));
    }

    @PutMapping("/{feedbackId}")
    public ResponseEntity<FeedbackResponse> update(@AuthenticationPrincipal UserPrincipal principal,
                                                     @PathVariable UUID feedbackId,
                                                     @Valid @RequestBody FeedbackRequest request) {
        return ResponseEntity.ok(feedbackService.update(feedbackId, principal.getId(), request));
    }

    @DeleteMapping("/{feedbackId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable UUID feedbackId) {
        feedbackService.delete(feedbackId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<Page<FeedbackResponse>> listForUser(@AuthenticationPrincipal UserPrincipal principal,
                                                               @PathVariable UUID userId,
                                                               @RequestParam(required = false) LocalDate dateFrom,
                                                               @RequestParam(required = false) LocalDate dateTo,
                                                               @RequestParam(required = false) FeedbackType type,
                                                               @PageableDefault(size = 20) Pageable pageable) {
        userService.verifyManagerAccess(principal.getId(), principal.getRole(), userId);
        return ResponseEntity.ok(feedbackService.list(userId, dateFrom, dateTo, type, pageable));
    }
}
