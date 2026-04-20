package com.onboarding.report.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.exception.ResourceNotFoundException;
import com.onboarding.report.client.DiaryServiceClient;
import com.onboarding.report.dto.ReportPreview;
import com.onboarding.report.dto.ReportRequest;
import com.onboarding.report.entity.GeneratedReport;
import com.onboarding.report.generator.CsvReportGenerator;
import com.onboarding.report.generator.PdfReportGenerator;
import com.onboarding.report.repository.GeneratedReportRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    private final GeneratedReportRepository reportRepository;
    private final DiaryServiceClient diaryServiceClient;
    private final PdfReportGenerator pdfReportGenerator;
    private final CsvReportGenerator csvReportGenerator;
    private final ObjectMapper objectMapper;

    public ReportService(GeneratedReportRepository reportRepository,
                         DiaryServiceClient diaryServiceClient,
                         PdfReportGenerator pdfReportGenerator,
                         CsvReportGenerator csvReportGenerator,
                         ObjectMapper objectMapper) {
        this.reportRepository = reportRepository;
        this.diaryServiceClient = diaryServiceClient;
        this.pdfReportGenerator = pdfReportGenerator;
        this.csvReportGenerator = csvReportGenerator;
        this.objectMapper = objectMapper;
    }

    public ReportPreview generateReport(String requestingUserId, String requestingUserRole,
                                        ReportRequest request) {
        String targetUserId = determineTargetUser(requestingUserId, requestingUserRole, request);

        Map<String, List<Map<String, Object>>> data = fetchDataForCategories(
                targetUserId, request.getDateFrom(), request.getDateTo(), request.getCategories());

        Map<String, Integer> summary = new HashMap<>();
        for (Map.Entry<String, List<Map<String, Object>>> entry : data.entrySet()) {
            summary.put(entry.getKey(), entry.getValue().size());
        }

        String reportId = UUID.randomUUID().toString();
        String now = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        String reportDataJson;
        try {
            reportDataJson = objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize report data", e);
        }

        GeneratedReport report = GeneratedReport.builder()
                .id(reportId)
                .userId(requestingUserId)
                .targetUserId(targetUserId)
                .dateFrom(request.getDateFrom())
                .dateTo(request.getDateTo())
                .categories(String.join(",", request.getCategories()))
                .format(request.getFormat())
                .status("GENERATED")
                .reportData(reportDataJson)
                .createdAt(now)
                .build();

        reportRepository.save(report);

        return ReportPreview.builder()
                .reportId(reportId)
                .generatedAt(now)
                .summary(summary)
                .previewData(data)
                .build();
    }

    public byte[] exportPdf(String reportId, String requestingUserId) {
        GeneratedReport report = getReportWithAccessCheck(reportId, requestingUserId);
        Map<String, List<Map<String, Object>>> data = parseReportData(report);
        return pdfReportGenerator.generate(report.getDateFrom(), report.getDateTo(),
                report.getCreatedAt(), data);
    }

    public byte[] exportCsv(String reportId, String requestingUserId) {
        GeneratedReport report = getReportWithAccessCheck(reportId, requestingUserId);
        Map<String, List<Map<String, Object>>> data = parseReportData(report);
        return csvReportGenerator.generate(report.getDateFrom(), report.getDateTo(),
                report.getCreatedAt(), data);
    }

    public Page<GeneratedReport> getUserReports(String userId, Pageable pageable) {
        return reportRepository.findByUserId(userId, pageable);
    }

    private String determineTargetUser(String requestingUserId, String requestingUserRole,
                                       ReportRequest request) {
        if (request.getUserId() != null && !request.getUserId().isBlank()) {
            if ("ADMIN".equals(requestingUserRole) || "MANAGER".equals(requestingUserRole)) {
                return request.getUserId();
            }
            throw new AccessDeniedException("Only managers and admins can generate reports for other users");
        }
        return requestingUserId;
    }

    private Map<String, List<Map<String, Object>>> fetchDataForCategories(
            String userId, String dateFrom, String dateTo, List<String> categories) {
        Map<String, List<Map<String, Object>>> data = new LinkedHashMap<>();

        for (String category : categories) {
            switch (category.toUpperCase()) {
                case "TASKS":
                    data.put("TASKS", diaryServiceClient.getTasks(userId, dateFrom, dateTo));
                    break;
                case "ISSUES":
                    data.put("ISSUES", diaryServiceClient.getIssues(userId, dateFrom, dateTo));
                    break;
                case "FEEDBACK":
                    data.put("FEEDBACK", diaryServiceClient.getFeedback(userId, dateFrom, dateTo));
                    break;
                case "NOTES":
                    data.put("NOTES", diaryServiceClient.getNotes(userId, dateFrom, dateTo));
                    break;
                default:
                    break;
            }
        }
        return data;
    }

    private GeneratedReport getReportWithAccessCheck(String reportId, String requestingUserId) {
        return reportRepository.findByIdAndUserId(reportId, requestingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", reportId));
    }

    private Map<String, List<Map<String, Object>>> parseReportData(GeneratedReport report) {
        try {
            return objectMapper.readValue(report.getReportData(),
                    new TypeReference<Map<String, List<Map<String, Object>>>>() {});
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse report data", e);
        }
    }
}
