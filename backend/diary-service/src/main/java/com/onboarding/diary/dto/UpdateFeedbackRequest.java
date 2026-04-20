package com.onboarding.diary.dto;

import com.onboarding.diary.entity.FeedbackType;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateFeedbackRequest {

    private String date;

    @Size(max = 255, message = "Subject must not exceed 255 characters")
    private String subject;

    private FeedbackType type;

    private String details;
}
