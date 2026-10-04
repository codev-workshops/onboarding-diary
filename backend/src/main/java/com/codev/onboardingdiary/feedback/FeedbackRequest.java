package com.codev.onboardingdiary.feedback;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record FeedbackRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 150) String subject,
    @NotNull FeedbackType type,
    @NotBlank @Size(max = 5000) String details,
    Integer version) {}
