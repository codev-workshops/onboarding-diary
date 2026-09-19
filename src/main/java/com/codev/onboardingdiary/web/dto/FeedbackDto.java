package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.FeedbackType;
import java.time.LocalDate;

public record FeedbackDto(Long id,
                          LocalDate date,
                          String subject,
                          FeedbackType type,
                          String details) {
}
