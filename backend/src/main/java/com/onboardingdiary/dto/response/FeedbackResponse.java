package com.onboardingdiary.dto.response;

import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.enums.FeedbackType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class FeedbackResponse {
    private UUID id;
    private UUID userId;
    private LocalDate date;
    private String subject;
    private FeedbackType type;
    private String details;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FeedbackResponse from(Feedback feedback) {
        return FeedbackResponse.builder()
                .id(feedback.getId())
                .userId(feedback.getUser().getId())
                .date(feedback.getDate())
                .subject(feedback.getSubject())
                .type(feedback.getType())
                .details(feedback.getDetails())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }
}
