package com.codev.onboardingdiary.entry.task;

import java.time.LocalDate;

/** Optional list filters for tasks. */
public record TaskFilter(
    LocalDate from, LocalDate to, TaskCategory category, TaskStatus status) {}
