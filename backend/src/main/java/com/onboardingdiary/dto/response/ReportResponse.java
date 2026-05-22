package com.onboardingdiary.dto.response;

import com.onboardingdiary.entity.Report;
import com.onboardingdiary.enums.ReportFormat;
import com.onboardingdiary.enums.ReportType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ReportResponse {
    private UUID id;
    private UUID generatedById;
    private UUID targetUserId;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private ReportType reportType;
    private ReportFormat format;
    private String downloadUrl;
    private LocalDateTime createdAt;

    public static ReportResponse from(Report report) {
        return ReportResponse.builder()
                .id(report.getId())
                .generatedById(report.getGeneratedBy().getId())
                .targetUserId(report.getTargetUser() != null ? report.getTargetUser().getId() : null)
                .dateFrom(report.getDateFrom())
                .dateTo(report.getDateTo())
                .reportType(report.getReportType())
                .format(report.getFormat())
                .downloadUrl("/reports/" + report.getId() + "/download")
                .createdAt(report.getCreatedAt())
                .build();
    }
}
