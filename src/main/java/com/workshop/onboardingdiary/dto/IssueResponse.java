package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import java.time.LocalDate;

public record IssueResponse(Long id, Long ownerId,
                            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                            LocalDate entryDate,
                            String title, String description, IssueSeverity severity,
                            IssueStatus status, String resolutionNotes) {

    public static IssueResponse from(IssueEntry issue) {
        return new IssueResponse(issue.getId(), issue.getOwner().getId(), issue.getEntryDate(), issue.getTitle(),
                issue.getDescription(), issue.getSeverity(), issue.getStatus(), issue.getResolutionNotes());
    }
}
