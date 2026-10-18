package com.codev.onboardingdiary.entry.issue;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Create/update payload for an issue. */
public record IssueRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 120) String title,
    @Size(max = 4000) String description,
    @NotNull IssueSeverity severity,
    @NotNull IssueStatus status,
    @Size(max = 4000) String resolutionNotes) {}
