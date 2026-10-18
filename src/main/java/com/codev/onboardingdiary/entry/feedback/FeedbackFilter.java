package com.codev.onboardingdiary.entry.feedback;

import java.time.LocalDate;

/** Optional list filters; null fields are ignored. */
public record FeedbackFilter(LocalDate from, LocalDate to, FeedbackType type) {}
