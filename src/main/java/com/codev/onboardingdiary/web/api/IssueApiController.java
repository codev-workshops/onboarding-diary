package com.codev.onboardingdiary.web.api;

import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.Severity;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.IssueService;
import com.codev.onboardingdiary.web.dto.DtoMapper;
import com.codev.onboardingdiary.web.dto.IssueDto;
import com.codev.onboardingdiary.web.dto.IssueFilter;
import com.codev.onboardingdiary.web.dto.IssueForm;
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
@RequestMapping("/api/issues")
public class IssueApiController {

    private final IssueService issueService;

    public IssueApiController(IssueService issueService) {
        this.issueService = issueService;
    }

    @GetMapping
    public List<IssueDto> list(@AuthenticationPrincipal AppUserDetails principal,
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                               @RequestParam(required = false) IssueStatus status,
                               @RequestParam(required = false) Severity severity) {
        return issueService.list(principal, principal.getId(), new IssueFilter(from, to, status, severity))
                .stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    public ResponseEntity<IssueDto> create(@AuthenticationPrincipal AppUserDetails principal,
                                           @Valid @RequestBody IssueForm form) {
        return ResponseEntity.status(HttpStatus.CREATED).body(DtoMapper.toDto(issueService.create(principal, form)));
    }

    @GetMapping("/{id}")
    public IssueDto get(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        return DtoMapper.toDto(issueService.getForRead(principal, id));
    }

    @PutMapping("/{id}")
    public IssueDto update(@AuthenticationPrincipal AppUserDetails principal,
                           @PathVariable Long id,
                           @Valid @RequestBody IssueForm form) {
        return DtoMapper.toDto(issueService.update(principal, id, form));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        issueService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
