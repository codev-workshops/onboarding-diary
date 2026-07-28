package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.entity.FeedbackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Create/update payload for a feedback note (REQUIREMENTS 2.4, 6.1). */
public record FeedbackRequest(
        @NotNull(message = "Entry date is required")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate entryDate,

        @NotBlank(message = "Subject is required")
        @Size(min = 1, max = 150, message = "Subject must be between 1 and 150 characters")
        String subject,

        @NotNull(message = "Type is required")
        FeedbackType type,

        @NotBlank(message = "Details are required")
        @Size(min = 1, max = 5000, message = "Details must be between 1 and 5000 characters")
        String details) {
}
