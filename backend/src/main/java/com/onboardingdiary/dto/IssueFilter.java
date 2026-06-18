package com.onboardingdiary.dto;

import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;

import java.time.LocalDate;

/**
 * Optional filters applied to an issue listing. Any null field is ignored.
 */
public record IssueFilter(
        Long ownerId,
        IssueStatus status,
        IssueSeverity severity,
        LocalDate dateFrom,
        LocalDate dateTo,
        String search
) {
}
