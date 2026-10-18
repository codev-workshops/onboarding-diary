package com.codev.onboardingdiary.entry.feedback;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Create/update payload for feedback. */
public record FeedbackRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 120) String subject,
    @NotNull FeedbackType type,
    @NotBlank @Size(max = 4000) String details) {}
