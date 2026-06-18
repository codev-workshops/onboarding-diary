package com.onboardingdiary.controller;

import com.onboardingdiary.dto.CreateIssueRequest;
import com.onboardingdiary.dto.IssueFilter;
import com.onboardingdiary.dto.IssueResponse;
import com.onboardingdiary.dto.PagedResponse;
import com.onboardingdiary.dto.UpdateIssueRequest;
import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;
import com.onboardingdiary.security.AuthenticatedUser;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.IssueService;
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
@RequestMapping("/api/v1/issues")
@Tag(name = "Issue log")
public class IssueController {

    private static final int MAX_PAGE_SIZE = 100;

    private final IssueService issueService;

    public IssueController(IssueService issueService) {
        this.issueService = issueService;
    }

    @PostMapping
    @Operation(summary = "Create an issue owned by the authenticated user")
    public ResponseEntity<IssueResponse> create(@Valid @RequestBody CreateIssueRequest request) {
        IssueResponse created = issueService.create(CurrentUser.require(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List issues (recruit: own; manager: own + assigned recruits; admin: all)")
    public PagedResponse<IssueResponse> list(
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) IssueStatus status,
            @RequestParam(required = false) IssueSeverity severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        AuthenticatedUser caller = CurrentUser.require();
        IssueFilter filter = new IssueFilter(ownerId, status, severity, dateFrom, dateTo, search);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size),
                Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id")));
        return PagedResponse.from(issueService.list(caller, filter, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an issue by id (owner, assigned manager, or admin)")
    public IssueResponse get(@PathVariable Long id) {
        return issueService.get(CurrentUser.require(), id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an issue (owner only)")
    public IssueResponse update(@PathVariable Long id, @Valid @RequestBody UpdateIssueRequest request) {
        return issueService.update(CurrentUser.require(), id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an issue (owner only)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        issueService.delete(CurrentUser.require(), id);
        return ResponseEntity.noContent().build();
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 1;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
