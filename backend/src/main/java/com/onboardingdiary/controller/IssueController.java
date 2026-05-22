package com.onboardingdiary.controller;

import com.onboardingdiary.dto.request.IssueRequest;
import com.onboardingdiary.dto.response.IssueResponse;
import com.onboardingdiary.enums.IssueSeverity;
import com.onboardingdiary.enums.IssueStatus;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.IssueService;
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
@RequestMapping("/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;
    private final UserService userService;

    @PostMapping
    public ResponseEntity<IssueResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                  @Valid @RequestBody IssueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(issueService.create(principal.getId(), request));
    }

    @GetMapping
    public ResponseEntity<Page<IssueResponse>> list(@AuthenticationPrincipal UserPrincipal principal,
                                                     @RequestParam(required = false) LocalDate dateFrom,
                                                     @RequestParam(required = false) LocalDate dateTo,
                                                     @RequestParam(required = false) IssueSeverity severity,
                                                     @RequestParam(required = false) IssueStatus status,
                                                     @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(issueService.list(principal.getId(), dateFrom, dateTo, severity, status, pageable));
    }

    @GetMapping("/{issueId}")
    public ResponseEntity<IssueResponse> getById(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable UUID issueId) {
        return ResponseEntity.ok(issueService.getById(issueId, principal.getId(), principal.getRole()));
    }

    @PutMapping("/{issueId}")
    public ResponseEntity<IssueResponse> update(@AuthenticationPrincipal UserPrincipal principal,
                                                  @PathVariable UUID issueId,
                                                  @Valid @RequestBody IssueRequest request) {
        return ResponseEntity.ok(issueService.update(issueId, principal.getId(), request));
    }

    @DeleteMapping("/{issueId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable UUID issueId) {
        issueService.delete(issueId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<Page<IssueResponse>> listForUser(@AuthenticationPrincipal UserPrincipal principal,
                                                            @PathVariable UUID userId,
                                                            @RequestParam(required = false) LocalDate dateFrom,
                                                            @RequestParam(required = false) LocalDate dateTo,
                                                            @RequestParam(required = false) IssueSeverity severity,
                                                            @RequestParam(required = false) IssueStatus status,
                                                            @PageableDefault(size = 20) Pageable pageable) {
        userService.verifyManagerAccess(principal.getId(), principal.getRole(), userId);
        return ResponseEntity.ok(issueService.list(userId, dateFrom, dateTo, severity, status, pageable));
    }
}
