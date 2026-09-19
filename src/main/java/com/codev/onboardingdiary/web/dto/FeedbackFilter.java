package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.FeedbackType;
import java.time.LocalDate;

public record FeedbackFilter(LocalDate from, LocalDate to, FeedbackType type) {

    public static FeedbackFilter empty() {
        return new FeedbackFilter(null, null, null);
    }
}
