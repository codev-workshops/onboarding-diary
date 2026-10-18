package com.codev.onboardingdiary.entry.feedback;

import java.time.Instant;
import java.time.LocalDate;

/** API representation of feedback. */
public record FeedbackDto(
    Long id,
    LocalDate entryDate,
    String subject,
    FeedbackType type,
    String details,
    Instant createdAt,
    Instant updatedAt) {

  public static FeedbackDto of(FeedbackEntry feedback) {
    return new FeedbackDto(
        feedback.getId(),
        feedback.getEntryDate(),
        feedback.getSubject(),
        feedback.getType(),
        feedback.getDetails(),
        feedback.getCreatedAt(),
        feedback.getUpdatedAt());
  }
}
