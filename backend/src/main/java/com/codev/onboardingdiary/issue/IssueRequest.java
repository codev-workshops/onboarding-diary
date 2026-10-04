package com.codev.onboardingdiary.issue;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Create/update payload. Status defaults to OPEN. */
public record IssueRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 150) String title,
    @Size(max = 5000) String description,
    @NotNull IssueSeverity severity,
    IssueStatus status,
    @Size(max = 5000) String resolutionNotes,
    Long relatedTaskId,
    Integer version) {

  IssueStatus statusOrDefault() {
    return status == null ? IssueStatus.OPEN : status;
  }
}
