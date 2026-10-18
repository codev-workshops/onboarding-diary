package com.codev.onboardingdiary.entry.issue;

import java.time.LocalDate;

/** Optional list filters; null fields are ignored. */
public record IssueFilter(
    LocalDate from, LocalDate to, IssueStatus status, IssueSeverity severity) {}
