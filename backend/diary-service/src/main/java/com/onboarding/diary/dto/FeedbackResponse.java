package com.onboarding.diary.dto;

import com.onboarding.diary.entity.FeedbackSource;
import com.onboarding.diary.entity.FeedbackType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponse {
    private String id;
    private String userId;
    private String date;
    private String subject;
    private FeedbackType type;
    private String details;
    private FeedbackSource source;
    private String createdAt;
    private String updatedAt;
}
