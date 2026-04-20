package com.onboarding.diary.dto;

import com.onboarding.diary.entity.IssueStatus;
import com.onboarding.diary.entity.Severity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateIssueRequest {

    @NotBlank(message = "Date is required")
    private String date;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private Severity severity;

    private IssueStatus status;

    private String resolutionNotes;
}
