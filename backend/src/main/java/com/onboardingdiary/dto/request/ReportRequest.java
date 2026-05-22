package com.onboardingdiary.dto.request;

import com.onboardingdiary.enums.ReportFormat;
import com.onboardingdiary.enums.ReportType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class ReportRequest {

    @NotNull(message = "Start date is required")
    private LocalDate dateFrom;

    @NotNull(message = "End date is required")
    private LocalDate dateTo;

    @NotNull(message = "Report type is required")
    private ReportType reportType;

    @NotNull(message = "Format is required")
    private ReportFormat format;

    private UUID userId;
}
