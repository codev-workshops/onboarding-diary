package com.onboarding.report.controller;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.BadRequestException;
import com.onboarding.common.security.SecurityUtils;
import com.onboarding.report.dto.ReportPreview;
import com.onboarding.report.dto.ReportRequest;
import com.onboarding.report.dto.ReportSummary;
import com.onboarding.report.entity.GeneratedReport;
import com.onboarding.report.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/generate")
    public ResponseEntity<ReportPreview> generateReport(@Valid @RequestBody ReportRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        String role = SecurityUtils.getCurrentUserRole();
        ReportPreview preview = reportService.generateReport(userId, role, request);
        return ResponseEntity.ok(preview);
    }

    @GetMapping("/download/{reportId}")
    public ResponseEntity<byte[]> downloadReport(
            @PathVariable String reportId,
            @RequestParam(defaultValue = "PDF") String format) {
        String userId = SecurityUtils.getCurrentUserId();

        if ("PDF".equalsIgnoreCase(format)) {
            byte[] pdfBytes = reportService.exportPdf(reportId, userId);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"report-" + reportId + ".pdf\"")
                    .body(pdfBytes);
        } else if ("CSV".equalsIgnoreCase(format)) {
            byte[] csvBytes = reportService.exportCsv(reportId, userId);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"report-" + reportId + ".csv\"")
                    .body(csvBytes);
        } else {
            throw new BadRequestException("Unsupported format: " + format + ". Use PDF or CSV.");
        }
    }

    @GetMapping
    public ResponseEntity<PageResponse<ReportSummary>> listReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String userId = SecurityUtils.getCurrentUserId();
        Page<GeneratedReport> reports = reportService.getUserReports(userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        PageResponse<ReportSummary> response = PageResponse.<ReportSummary>builder()
                .content(reports.getContent().stream()
                        .map(this::toSummary)
                        .toList())
                .page(reports.getNumber())
                .size(reports.getSize())
                .totalElements(reports.getTotalElements())
                .totalPages(reports.getTotalPages())
                .build();

        return ResponseEntity.ok(response);
    }

    private ReportSummary toSummary(GeneratedReport report) {
        return ReportSummary.builder()
                .id(report.getId())
                .dateFrom(report.getDateFrom())
                .dateTo(report.getDateTo())
                .categories(report.getCategories())
                .format(report.getFormat())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
