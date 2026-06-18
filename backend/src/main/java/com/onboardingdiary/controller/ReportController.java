package com.onboardingdiary.controller;

import com.onboardingdiary.dto.ReportData;
import com.onboardingdiary.dto.ReportFormat;
import com.onboardingdiary.dto.ReportType;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.ReportService;
import com.onboardingdiary.service.report.CsvReportRenderer;
import com.onboardingdiary.service.report.PdfReportRenderer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Reports")
public class ReportController {

    private static final MediaType MEDIA_CSV = new MediaType("text", "csv");

    private final ReportService reportService;
    private final CsvReportRenderer csvRenderer;
    private final PdfReportRenderer pdfRenderer;

    public ReportController(ReportService reportService,
                            CsvReportRenderer csvRenderer,
                            PdfReportRenderer pdfRenderer) {
        this.reportService = reportService;
        this.csvRenderer = csvRenderer;
        this.pdfRenderer = pdfRenderer;
    }

    @GetMapping
    @Operation(summary = "Generate a CSV or PDF report scoped to the caller (recruit: own; manager: assigned recruits; admin: all)")
    public ResponseEntity<byte[]> generate(
            @RequestParam ReportType type,
            @RequestParam(defaultValue = "CSV") ReportFormat format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) Long ownerId) {

        ReportData report = reportService.generate(CurrentUser.require(), type, dateFrom, dateTo, ownerId);

        byte[] body;
        MediaType contentType;
        String extension;
        if (format == ReportFormat.PDF) {
            body = pdfRenderer.render(report);
            contentType = MediaType.APPLICATION_PDF;
            extension = "pdf";
        } else {
            body = csvRenderer.render(report);
            contentType = MEDIA_CSV;
            extension = "csv";
        }

        String filename = type.name().toLowerCase() + "-report-" + LocalDate.now() + "." + extension;
        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(body);
    }
}
