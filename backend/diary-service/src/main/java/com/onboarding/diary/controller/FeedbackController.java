package com.onboarding.diary.controller;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.security.SecurityUtils;
import com.onboarding.diary.dto.CreateFeedbackRequest;
import com.onboarding.diary.dto.FeedbackFilterParams;
import com.onboarding.diary.dto.FeedbackResponse;
import com.onboarding.diary.dto.UpdateFeedbackRequest;
import com.onboarding.diary.entity.FeedbackType;
import com.onboarding.diary.service.FeedbackService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<FeedbackResponse> create(@Valid @RequestBody CreateFeedbackRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        FeedbackResponse response = feedbackService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<FeedbackResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) FeedbackType type) {
        String userId = SecurityUtils.getCurrentUserId();
        FeedbackFilterParams filters = FeedbackFilterParams.builder()
                .type(type)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(feedbackService.list(userId, filters, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeedbackResponse> getById(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        String role = SecurityUtils.getCurrentUserRole();
        return ResponseEntity.ok(feedbackService.getById(id, userId, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FeedbackResponse> update(@PathVariable String id,
            @Valid @RequestBody UpdateFeedbackRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(feedbackService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        feedbackService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<PageResponse<FeedbackResponse>> listForUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) FeedbackType type) {
        String role = SecurityUtils.getCurrentUserRole();
        if (!"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Only managers and admins can view other users' feedback");
        }
        FeedbackFilterParams filters = FeedbackFilterParams.builder()
                .type(type)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(feedbackService.listForUser(userId, filters, pageable));
    }

    @GetMapping("/internal/user/{userId}")
    public ResponseEntity<List<FeedbackResponse>> getFeedbackInRange(
            @PathVariable String userId,
            @RequestParam String dateFrom,
            @RequestParam String dateTo) {
        return ResponseEntity.ok(feedbackService.getFeedbackInRange(userId, dateFrom, dateTo));
    }
}
