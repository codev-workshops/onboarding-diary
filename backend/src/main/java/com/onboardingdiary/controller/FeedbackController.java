package com.onboardingdiary.controller;

import com.onboardingdiary.dto.CreateFeedbackRequest;
import com.onboardingdiary.dto.FeedbackFilter;
import com.onboardingdiary.dto.FeedbackResponse;
import com.onboardingdiary.dto.PagedResponse;
import com.onboardingdiary.dto.UpdateFeedbackRequest;
import com.onboardingdiary.entity.FeedbackType;
import com.onboardingdiary.security.AuthenticatedUser;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/feedback")
@Tag(name = "Feedback notes")
public class FeedbackController {

    private static final int MAX_PAGE_SIZE = 100;

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping
    @Operation(summary = "Create a feedback note owned by the authenticated user")
    public ResponseEntity<FeedbackResponse> create(@Valid @RequestBody CreateFeedbackRequest request) {
        FeedbackResponse created = feedbackService.create(CurrentUser.require(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List feedback (recruit: own; manager: own + assigned recruits; admin: all)")
    public PagedResponse<FeedbackResponse> list(
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) FeedbackType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        AuthenticatedUser caller = CurrentUser.require();
        FeedbackFilter filter = new FeedbackFilter(ownerId, type, dateFrom, dateTo, search);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size),
                Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id")));
        return PagedResponse.from(feedbackService.list(caller, filter, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a feedback note by id (owner, assigned manager, or admin)")
    public FeedbackResponse get(@PathVariable Long id) {
        return feedbackService.get(CurrentUser.require(), id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a feedback note (owner only)")
    public FeedbackResponse update(@PathVariable Long id, @Valid @RequestBody UpdateFeedbackRequest request) {
        return feedbackService.update(CurrentUser.require(), id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a feedback note (owner only)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        feedbackService.delete(CurrentUser.require(), id);
        return ResponseEntity.noContent().build();
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 1;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
