package com.codev.onboardingdiary.feedback;

import java.time.Instant;
import java.time.LocalDate;

public record FeedbackResponse(
    Long id,
    LocalDate entryDate,
    String subject,
    FeedbackType type,
    String details,
    Instant createdAt,
    Instant updatedAt,
    int version) {

  public static FeedbackResponse from(Feedback feedback) {
    return new FeedbackResponse(
        feedback.getId(),
        feedback.getEntryDate(),
        feedback.getSubject(),
        feedback.getType(),
        feedback.getDetails(),
        feedback.getCreatedAt(),
        feedback.getUpdatedAt(),
        feedback.getVersion());
  }
}
