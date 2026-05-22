package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.IssueRequest;
import com.onboardingdiary.dto.response.IssueResponse;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.IssueSeverity;
import com.onboardingdiary.enums.IssueStatus;
import com.onboardingdiary.exception.BadRequestException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueRepository issueRepository;
    private final UserRepository userRepository;

    @Transactional
    public IssueResponse create(UUID userId, IssueRequest request) {
        validateResolutionNotes(request);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Issue issue = Issue.builder()
                .user(user)
                .date(request.getDate())
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(request.getSeverity())
                .status(request.getStatus())
                .resolutionNotes(request.getResolutionNotes())
                .build();

        issue = issueRepository.save(issue);
        return IssueResponse.from(issue);
    }

    public Page<IssueResponse> list(UUID userId, LocalDate dateFrom, LocalDate dateTo,
                                     IssueSeverity severity, IssueStatus status, Pageable pageable) {
        return issueRepository.findByUserWithFilters(userId, dateFrom, dateTo,
                        severity != null ? severity.name() : null,
                        status != null ? status.name() : null, pageable)
                .map(IssueResponse::from);
    }

    public IssueResponse getById(UUID issueId, UUID requestingUserId, String role) {
        Issue issue = findIssueOrThrow(issueId);
        checkAccess(issue, requestingUserId, role);
        return IssueResponse.from(issue);
    }

    @Transactional
    public IssueResponse update(UUID issueId, UUID userId, IssueRequest request) {
        validateResolutionNotes(request);

        Issue issue = findIssueOrThrow(issueId);
        checkOwnership(issue, userId);

        issue.setDate(request.getDate());
        issue.setTitle(request.getTitle());
        issue.setDescription(request.getDescription());
        issue.setSeverity(request.getSeverity());
        issue.setStatus(request.getStatus());
        issue.setResolutionNotes(request.getResolutionNotes());

        issue = issueRepository.save(issue);
        return IssueResponse.from(issue);
    }

    @Transactional
    public void delete(UUID issueId, UUID userId) {
        Issue issue = findIssueOrThrow(issueId);
        checkOwnership(issue, userId);
        issueRepository.delete(issue);
    }

    private void validateResolutionNotes(IssueRequest request) {
        if ((request.getStatus() == IssueStatus.RESOLVED || request.getStatus() == IssueStatus.CLOSED)
                && (request.getResolutionNotes() == null || request.getResolutionNotes().isBlank())) {
            throw new BadRequestException("Resolution notes are required when status is RESOLVED or CLOSED");
        }
    }

    private Issue findIssueOrThrow(UUID issueId) {
        return issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));
    }

    private void checkOwnership(Issue issue, UUID userId) {
        if (!issue.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only modify your own issues");
        }
    }

    private void checkAccess(Issue issue, UUID requestingUserId, String role) {
        if (role.equals("ADMIN")) return;
        if (issue.getUser().getId().equals(requestingUserId)) return;
        if (role.equals("MANAGER")) {
            User issueOwner = issue.getUser();
            if (issueOwner.getManager() != null && issueOwner.getManager().getId().equals(requestingUserId)) {
                return;
            }
        }
        throw new UnauthorizedException("Access denied");
    }
}
