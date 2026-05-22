package com.onboardingdiary.dto.response;

import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.enums.IssueSeverity;
import com.onboardingdiary.enums.IssueStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class IssueResponse {
    private UUID id;
    private UUID userId;
    private LocalDate date;
    private String title;
    private String description;
    private IssueSeverity severity;
    private IssueStatus status;
    private String resolutionNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static IssueResponse from(Issue issue) {
        return IssueResponse.builder()
                .id(issue.getId())
                .userId(issue.getUser().getId())
                .date(issue.getDate())
                .title(issue.getTitle())
                .description(issue.getDescription())
                .severity(issue.getSeverity())
                .status(issue.getStatus())
                .resolutionNotes(issue.getResolutionNotes())
                .createdAt(issue.getCreatedAt())
                .updatedAt(issue.getUpdatedAt())
                .build();
    }
}
