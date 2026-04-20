package com.onboarding.diary.dto;

import com.onboarding.diary.entity.IssueStatus;
import com.onboarding.diary.entity.Severity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueResponse {
    private String id;
    private String userId;
    private String date;
    private String title;
    private String description;
    private Severity severity;
    private IssueStatus status;
    private String resolutionNotes;
    private String createdAt;
    private String updatedAt;
}
