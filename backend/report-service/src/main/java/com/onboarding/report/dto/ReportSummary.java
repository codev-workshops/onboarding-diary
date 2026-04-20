package com.onboarding.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportSummary {

    private String id;
    private String dateFrom;
    private String dateTo;
    private String categories;
    private String format;
    private String status;
    private String createdAt;
}
