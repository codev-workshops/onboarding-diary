package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.FeedbackRequest;
import com.workshop.onboardingdiary.dto.FeedbackResponse;
import com.workshop.onboardingdiary.entity.FeedbackType;
import com.workshop.onboardingdiary.service.FeedbackService;
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

/** Feedback Note endpoints (REQUIREMENTS 4.4). */
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping
    public List<FeedbackResponse> list(Principal principal,
                                       @RequestParam(name = "userId", required = false) Long userId,
                                       @RequestParam(name = "type", required = false) FeedbackType type,
                                       @RequestParam(name = "dateFrom", required = false)
                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                       @RequestParam(name = "dateTo", required = false)
                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return feedbackService.list(principal.getName(), userId, type, dateFrom, dateTo);
    }

    @GetMapping("/{id}")
    public FeedbackResponse get(Principal principal, @PathVariable Long id) {
        return feedbackService.get(principal.getName(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FeedbackResponse create(Principal principal, @Valid @RequestBody FeedbackRequest request) {
        return feedbackService.create(principal.getName(), request);
    }

    @PutMapping("/{id}")
    public FeedbackResponse update(Principal principal, @PathVariable Long id,
                                   @Valid @RequestBody FeedbackRequest request) {
        return feedbackService.update(principal.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        feedbackService.delete(principal.getName(), id);
    }
}
