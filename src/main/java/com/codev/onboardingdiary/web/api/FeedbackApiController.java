package com.codev.onboardingdiary.web.api;

import com.codev.onboardingdiary.domain.FeedbackType;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.FeedbackService;
import com.codev.onboardingdiary.web.dto.DtoMapper;
import com.codev.onboardingdiary.web.dto.FeedbackDto;
import com.codev.onboardingdiary.web.dto.FeedbackFilter;
import com.codev.onboardingdiary.web.dto.FeedbackForm;
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
@RequestMapping("/api/feedback")
public class FeedbackApiController {

    private final FeedbackService feedbackService;

    public FeedbackApiController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping
    public List<FeedbackDto> list(@AuthenticationPrincipal AppUserDetails principal,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                  @RequestParam(required = false) FeedbackType type) {
        return feedbackService.list(principal, principal.getId(), new FeedbackFilter(from, to, type))
                .stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    public ResponseEntity<FeedbackDto> create(@AuthenticationPrincipal AppUserDetails principal,
                                              @Valid @RequestBody FeedbackForm form) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(DtoMapper.toDto(feedbackService.create(principal, form)));
    }

    @GetMapping("/{id}")
    public FeedbackDto get(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        return DtoMapper.toDto(feedbackService.getForRead(principal, id));
    }

    @PutMapping("/{id}")
    public FeedbackDto update(@AuthenticationPrincipal AppUserDetails principal,
                              @PathVariable Long id,
                              @Valid @RequestBody FeedbackForm form) {
        return DtoMapper.toDto(feedbackService.update(principal, id, form));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        feedbackService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
