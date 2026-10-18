package com.codev.onboardingdiary.entry.issue;

import java.time.Instant;
import java.time.LocalDate;

/** API representation of an issue. */
public record IssueDto(
    Long id,
    LocalDate entryDate,
    String title,
    String description,
    IssueSeverity severity,
    IssueStatus status,
    String resolutionNotes,
    Instant resolvedAt,
    Instant createdAt,
    Instant updatedAt) {

  public static IssueDto of(IssueEntry issue) {
    return new IssueDto(
        issue.getId(),
        issue.getEntryDate(),
        issue.getTitle(),
        issue.getDescription(),
        issue.getSeverity(),
        issue.getStatus(),
        issue.getResolutionNotes(),
        issue.getResolvedAt(),
        issue.getCreatedAt(),
        issue.getUpdatedAt());
  }
}
