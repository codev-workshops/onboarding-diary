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
public class IssueFilterParams {
    private Severity severity;
    private IssueStatus status;
    private String dateFrom;
    private String dateTo;
}
