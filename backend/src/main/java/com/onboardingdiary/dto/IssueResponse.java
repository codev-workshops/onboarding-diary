package com.onboardingdiary.dto;

import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Public projection of an issue.
 */
public record IssueResponse(
        Long id,
        Long ownerId,
        LocalDate date,
        String title,
        String description,
        IssueSeverity severity,
        IssueStatus status,
        String resolutionNotes,
        Instant createdAt,
        Instant updatedAt
) {
    public static IssueResponse from(Issue issue) {
        return new IssueResponse(
                issue.getId(),
                issue.getOwnerId(),
                issue.getDate(),
                issue.getTitle(),
                issue.getDescription(),
                issue.getSeverity(),
                issue.getStatus(),
                issue.getResolutionNotes(),
                issue.getCreatedAt(),
                issue.getUpdatedAt()
        );
    }
}
