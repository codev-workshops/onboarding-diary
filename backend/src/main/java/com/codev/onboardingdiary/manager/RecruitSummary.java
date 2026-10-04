package com.codev.onboardingdiary.manager;

import java.time.Instant;
import java.time.LocalDate;

/** Progress overview of one recruit, as shown in the manager's team list. */
public record RecruitSummary(
    Long id,
    String fullName,
    String email,
    String jobTitle,
    String department,
    LocalDate startDate,
    boolean enabled,
    long totalTasks,
    long completedTasks,
    double completionPct,
    long openIssues,
    long highSeverityOpenIssues,
    Instant lastActivityAt,
    boolean inactive,
    boolean atRisk) {}
