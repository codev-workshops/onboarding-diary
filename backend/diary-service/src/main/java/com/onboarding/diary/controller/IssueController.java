package com.onboarding.diary.controller;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.security.SecurityUtils;
import com.onboarding.diary.dto.CreateIssueRequest;
import com.onboarding.diary.dto.IssueFilterParams;
import com.onboarding.diary.dto.IssueResponse;
import com.onboarding.diary.dto.UpdateIssueRequest;
import com.onboarding.diary.entity.IssueStatus;
import com.onboarding.diary.entity.Severity;
import com.onboarding.diary.service.IssueService;
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
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;

    @PostMapping
    public ResponseEntity<IssueResponse> create(@Valid @RequestBody CreateIssueRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        IssueResponse response = issueService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<IssueResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) IssueStatus status) {
        String userId = SecurityUtils.getCurrentUserId();
        IssueFilterParams filters = IssueFilterParams.builder()
                .severity(severity)
                .status(status)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(issueService.list(userId, filters, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IssueResponse> getById(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        String role = SecurityUtils.getCurrentUserRole();
        return ResponseEntity.ok(issueService.getById(id, userId, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IssueResponse> update(@PathVariable String id,
            @Valid @RequestBody UpdateIssueRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(issueService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        issueService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<PageResponse<IssueResponse>> listForUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) IssueStatus status) {
        String role = SecurityUtils.getCurrentUserRole();
        if (!"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Only managers and admins can view other users' issues");
        }
        IssueFilterParams filters = IssueFilterParams.builder()
                .severity(severity)
                .status(status)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(issueService.listForUser(userId, filters, pageable));
    }

    @GetMapping("/internal/user/{userId}")
    public ResponseEntity<List<IssueResponse>> getIssuesInRange(
            @PathVariable String userId,
            @RequestParam String dateFrom,
            @RequestParam String dateTo) {
        return ResponseEntity.ok(issueService.getIssuesInRange(userId, dateFrom, dateTo));
    }
}
