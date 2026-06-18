package com.onboardingdiary.dto;

import com.onboardingdiary.entity.FeedbackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Request to create a feedback note. The owner is always the authenticated caller.
 */
public record CreateFeedbackRequest(
        @NotNull LocalDate date,
        @NotBlank @Size(min = 1, max = 200) String subject,
        @NotNull FeedbackType type,
        @Size(max = 5000) String details
) {
}
