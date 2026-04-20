package com.onboarding.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    private String userId;

    @NotBlank(message = "dateFrom is required")
    private String dateFrom;

    @NotBlank(message = "dateTo is required")
    private String dateTo;

    @NotEmpty(message = "At least one category is required")
    private List<String> categories;

    @NotNull(message = "format is required")
    @Pattern(regexp = "PDF|CSV", message = "Format must be PDF or CSV")
    private String format;
}
