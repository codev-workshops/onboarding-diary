package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.Severity;
import java.time.LocalDate;

public record IssueDto(Long id,
                       LocalDate date,
                       String title,
                       String description,
                       Severity severity,
                       IssueStatus status,
                       String resolutionNotes) {
}
