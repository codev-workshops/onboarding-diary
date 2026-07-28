package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.IssueRequest;
import com.workshop.onboardingdiary.dto.IssueResponse;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.service.IssueService;
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

/** Issue Log endpoints (REQUIREMENTS 4.3). */
@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueService issueService;

    public IssueController(IssueService issueService) {
        this.issueService = issueService;
    }

    @GetMapping
    public List<IssueResponse> list(Principal principal,
                                    @RequestParam(name = "userId", required = false) Long userId,
                                    @RequestParam(name = "status", required = false) IssueStatus status,
                                    @RequestParam(name = "severity", required = false) IssueSeverity severity,
                                    @RequestParam(name = "dateFrom", required = false)
                                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                    @RequestParam(name = "dateTo", required = false)
                                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return issueService.list(principal.getName(), userId, status, severity, dateFrom, dateTo);
    }

    @GetMapping("/{id}")
    public IssueResponse get(Principal principal, @PathVariable Long id) {
        return issueService.get(principal.getName(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IssueResponse create(Principal principal, @Valid @RequestBody IssueRequest request) {
        return issueService.create(principal.getName(), request);
    }

    @PutMapping("/{id}")
    public IssueResponse update(Principal principal, @PathVariable Long id, @Valid @RequestBody IssueRequest request) {
        return issueService.update(principal.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        issueService.delete(principal.getName(), id);
    }
}
