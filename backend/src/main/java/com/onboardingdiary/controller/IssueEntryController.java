package com.onboardingdiary.controller;

import com.onboardingdiary.dto.IssueEntryRequest;
import com.onboardingdiary.entity.IssueEntry;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.service.IssueEntryService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/issues")
public class IssueEntryController {

    private final IssueEntryService issueEntryService;
    private final UserRepository userRepository;

    public IssueEntryController(IssueEntryService issueEntryService, UserRepository userRepository) {
        this.issueEntryService = issueEntryService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<IssueEntry> create(@AuthenticationPrincipal UserDetails userDetails,
                                              @Valid @RequestBody IssueEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(issueEntryService.create(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<IssueEntry>> list(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(issueEntryService.getByUser(userId, dateFrom, dateTo, status, severity));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IssueEntry> getById(@PathVariable Long id) {
        return ResponseEntity.ok(issueEntryService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IssueEntry> update(@AuthenticationPrincipal UserDetails userDetails,
                                              @PathVariable Long id,
                                              @Valid @RequestBody IssueEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(issueEntryService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails userDetails,
                                        @PathVariable Long id) {
        Long userId = getUserId(userDetails);
        issueEntryService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
