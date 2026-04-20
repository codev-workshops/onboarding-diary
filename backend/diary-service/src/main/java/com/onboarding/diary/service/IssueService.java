package com.onboarding.diary.service;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.exception.ResourceNotFoundException;
import com.onboarding.diary.dto.CreateIssueRequest;
import com.onboarding.diary.dto.IssueFilterParams;
import com.onboarding.diary.dto.IssueResponse;
import com.onboarding.diary.dto.UpdateIssueRequest;
import com.onboarding.diary.entity.IssueEntry;
import com.onboarding.diary.entity.IssueStatus;
import com.onboarding.diary.entity.Severity;
import com.onboarding.diary.repository.IssueEntryRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueEntryRepository issueEntryRepository;

    @Transactional
    public IssueResponse create(String userId, CreateIssueRequest request) {
        String now = Instant.now().toString();
        IssueEntry entry = IssueEntry.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .date(request.getDate())
                .title(request.getTitle())
                .description(request.getDescription())
                .severity(request.getSeverity() != null ? request.getSeverity() : Severity.MEDIUM)
                .status(request.getStatus() != null ? request.getStatus() : IssueStatus.OPEN)
                .resolutionNotes(request.getResolutionNotes())
                .deleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        issueEntryRepository.save(entry);
        return toResponse(entry);
    }

    public IssueResponse getById(String id, String requestingUserId, String role) {
        IssueEntry entry = issueEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Issue", id));
        if (!entry.getUserId().equals(requestingUserId)
                && !"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("You do not have permission to view this issue");
        }
        return toResponse(entry);
    }

    public PageResponse<IssueResponse> list(String userId, IssueFilterParams filters, Pageable pageable) {
        Page<IssueEntry> page;
        if (filters.getSeverity() != null && filters.getStatus() != null) {
            page = issueEntryRepository.findByUserIdAndSeverityAndStatusAndDeletedFalse(
                    userId, filters.getSeverity(), filters.getStatus(), pageable);
        } else if (filters.getSeverity() != null) {
            page = issueEntryRepository.findByUserIdAndSeverityAndDeletedFalse(
                    userId, filters.getSeverity(), pageable);
        } else if (filters.getStatus() != null) {
            page = issueEntryRepository.findByUserIdAndStatusAndDeletedFalse(
                    userId, filters.getStatus(), pageable);
        } else {
            page = issueEntryRepository.findByUserIdAndDeletedFalse(userId, pageable);
        }
        return toPageResponse(page);
    }

    public PageResponse<IssueResponse> listForUser(String targetUserId, IssueFilterParams filters, Pageable pageable) {
        return list(targetUserId, filters, pageable);
    }

    @Transactional
    public IssueResponse update(String id, String userId, UpdateIssueRequest request) {
        IssueEntry entry = issueEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Issue", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to update this issue");
        }
        if (request.getDate() != null) entry.setDate(request.getDate());
        if (request.getTitle() != null) entry.setTitle(request.getTitle());
        if (request.getDescription() != null) entry.setDescription(request.getDescription());
        if (request.getSeverity() != null) entry.setSeverity(request.getSeverity());
        if (request.getStatus() != null) entry.setStatus(request.getStatus());
        if (request.getResolutionNotes() != null) entry.setResolutionNotes(request.getResolutionNotes());
        entry.setUpdatedAt(Instant.now().toString());
        issueEntryRepository.save(entry);
        return toResponse(entry);
    }

    @Transactional
    public void delete(String id, String userId) {
        IssueEntry entry = issueEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Issue", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to delete this issue");
        }
        entry.setDeleted(true);
        entry.setUpdatedAt(Instant.now().toString());
        issueEntryRepository.save(entry);
    }

    public List<IssueResponse> getIssuesInRange(String userId, String dateFrom, String dateTo) {
        return issueEntryRepository.findByUserIdAndDateBetweenAndDeletedFalse(userId, dateFrom, dateTo)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<IssueResponse> getRecentIssues(String userId, int limit) {
        return issueEntryRepository.findRecentByUserId(userId, Pageable.ofSize(limit))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public long countByUserId(String userId) {
        return issueEntryRepository.countByUserIdAndDeletedFalse(userId);
    }

    public long countByUserIdAndStatus(String userId, IssueStatus status) {
        return issueEntryRepository.countByUserIdAndStatusAndDeletedFalse(userId, status);
    }

    public long countByUserIdAndSeverity(String userId, Severity severity) {
        return issueEntryRepository.countByUserIdAndSeverityAndDeletedFalse(userId, severity);
    }

    private IssueResponse toResponse(IssueEntry entry) {
        return IssueResponse.builder()
                .id(entry.getId())
                .userId(entry.getUserId())
                .date(entry.getDate())
                .title(entry.getTitle())
                .description(entry.getDescription())
                .severity(entry.getSeverity())
                .status(entry.getStatus())
                .resolutionNotes(entry.getResolutionNotes())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }

    private PageResponse<IssueResponse> toPageResponse(Page<IssueEntry> page) {
        return PageResponse.<IssueResponse>builder()
                .content(page.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}
