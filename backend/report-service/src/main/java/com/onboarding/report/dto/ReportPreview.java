package com.onboarding.report.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportPreview {

    private String reportId;
    private String generatedAt;
    private Map<String, Integer> summary;
    private Map<String, List<Map<String, Object>>> previewData;
}
