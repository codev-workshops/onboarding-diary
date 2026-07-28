package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Create/update payload for an issue entry (REQUIREMENTS 2.3, 6.1). */
public record IssueRequest(
        @NotNull(message = "Entry date is required")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate entryDate,

        @NotBlank(message = "Title is required")
        @Size(min = 1, max = 150, message = "Title must be between 1 and 150 characters")
        String title,

        @Size(max = 5000, message = "Description must be at most 5000 characters")
        String description,

        @NotNull(message = "Severity is required")
        IssueSeverity severity,

        @NotNull(message = "Status is required")
        IssueStatus status,

        @Size(max = 5000, message = "Resolution notes must be at most 5000 characters")
        String resolutionNotes) {
}
