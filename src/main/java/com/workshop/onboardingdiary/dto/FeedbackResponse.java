package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.entity.FeedbackNote;
import com.workshop.onboardingdiary.entity.FeedbackType;
import java.time.LocalDate;

public record FeedbackResponse(Long id, Long ownerId,
                               @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                               LocalDate entryDate,
                               String subject, FeedbackType type, String details) {

    public static FeedbackResponse from(FeedbackNote feedback) {
        return new FeedbackResponse(feedback.getId(), feedback.getOwner().getId(), feedback.getEntryDate(),
                feedback.getSubject(), feedback.getType(), feedback.getDetails());
    }
}
