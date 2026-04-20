package com.onboarding.diary.dto;

import com.onboarding.diary.entity.IssueStatus;
import com.onboarding.diary.entity.Severity;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateIssueRequest {

    private String date;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String description;

    private Severity severity;

    private IssueStatus status;

    private String resolutionNotes;
}
