package com.onboardingdiary.dto;

import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Request to create an issue. The owner is always the authenticated caller.
 */
public record CreateIssueRequest(
        @NotNull LocalDate date,
        @NotBlank @Size(min = 1, max = 200) String title,
        @Size(max = 5000) String description,
        @NotNull IssueSeverity severity,
        IssueStatus status,
        @Size(max = 5000) String resolutionNotes
) {
}
