package com.codev.onboardingdiary.issue;

import java.time.LocalDate;
import java.util.List;

public record IssueFilter(
    LocalDate from,
    LocalDate to,
    List<IssueStatus> status,
    List<IssueSeverity> severity,
    String q) {}
