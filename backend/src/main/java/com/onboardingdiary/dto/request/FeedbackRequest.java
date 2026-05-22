package com.onboardingdiary.dto.request;

import com.onboardingdiary.enums.FeedbackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class FeedbackRequest {

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotBlank(message = "Subject is required")
    @Size(min = 3, max = 200, message = "Subject must be between 3 and 200 characters")
    private String subject;

    @NotNull(message = "Type is required")
    private FeedbackType type;

    @NotBlank(message = "Details are required")
    @Size(min = 10, max = 5000, message = "Details must be between 10 and 5000 characters")
    private String details;
}
