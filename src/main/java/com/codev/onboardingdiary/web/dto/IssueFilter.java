package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.Severity;
import java.time.LocalDate;

public record IssueFilter(LocalDate from, LocalDate to, IssueStatus status, Severity severity) {

    public static IssueFilter empty() {
        return new IssueFilter(null, null, null, null);
    }
}
