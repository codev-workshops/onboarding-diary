package com.onboardingdiary.dto;

import com.onboardingdiary.entity.FeedbackType;

import java.time.LocalDate;

/**
 * Optional filters applied to a feedback listing. Any null field is ignored.
 */
public record FeedbackFilter(
        Long ownerId,
        FeedbackType type,
        LocalDate dateFrom,
        LocalDate dateTo,
        String search
) {
}
