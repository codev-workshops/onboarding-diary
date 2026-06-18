package com.onboardingdiary.dto;

import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.FeedbackType;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Public projection of a feedback note.
 */
public record FeedbackResponse(
        Long id,
        Long ownerId,
        LocalDate date,
        String subject,
        FeedbackType type,
        String details,
        Instant createdAt,
        Instant updatedAt
) {
    public static FeedbackResponse from(Feedback feedback) {
        return new FeedbackResponse(
                feedback.getId(),
                feedback.getOwnerId(),
                feedback.getDate(),
                feedback.getSubject(),
                feedback.getType(),
                feedback.getDetails(),
                feedback.getCreatedAt(),
                feedback.getUpdatedAt()
        );
    }
}
