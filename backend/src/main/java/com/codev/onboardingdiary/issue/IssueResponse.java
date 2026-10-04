package com.codev.onboardingdiary.issue;

import com.codev.onboardingdiary.task.Task;
import java.time.Instant;
import java.time.LocalDate;

public record IssueResponse(
    Long id,
    LocalDate entryDate,
    String title,
    String description,
    IssueSeverity severity,
    IssueStatus status,
    String resolutionNotes,
    Instant resolvedAt,
    Long relatedTaskId,
    String relatedTaskTitle,
    Instant createdAt,
    Instant updatedAt,
    int version) {

  static IssueResponse from(Issue issue) {
    Task task = issue.getRelatedTask();
    return new IssueResponse(
        issue.getId(),
        issue.getEntryDate(),
        issue.getTitle(),
        issue.getDescription(),
        issue.getSeverity(),
        issue.getStatus(),
        issue.getResolutionNotes(),
        issue.getResolvedAt(),
        task == null ? null : task.getId(),
        task == null ? null : task.getTitle(),
        issue.getCreatedAt(),
        issue.getUpdatedAt(),
        issue.getVersion());
  }
}
