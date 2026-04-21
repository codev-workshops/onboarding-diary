package com.onboarding.diary.dto;

import com.onboarding.diary.entity.FeedbackSource;
import com.onboarding.diary.entity.FeedbackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFeedbackRequest {

    @NotBlank(message = "Date is required")
    private String date;

    @NotBlank(message = "Subject is required")
    @Size(max = 255, message = "Subject must not exceed 255 characters")
    private String subject;

    @NotNull(message = "Type is required")
    private FeedbackType type;

    @NotBlank(message = "Details are required")
    private String details;

    private FeedbackSource source;
}
