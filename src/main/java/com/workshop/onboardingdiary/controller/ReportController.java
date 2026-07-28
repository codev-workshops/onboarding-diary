package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.ReportFile;
import com.workshop.onboardingdiary.dto.ReportResponse;
import com.workshop.onboardingdiary.service.ReportService;
import java.security.Principal;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Report endpoints (REQUIREMENTS 4.7). The date and format parameters are taken as raw strings so
 * that a missing or badly formatted value is reported by the service as a field-level 400 instead
 * of a generic binding failure.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping
    public ResponseEntity<byte[]> download(Principal principal,
                                           @RequestParam(name = "userId", required = false) Long userId,
                                           @RequestParam(name = "dateFrom", required = false) String dateFrom,
                                           @RequestParam(name = "dateTo", required = false) String dateTo,
                                           @RequestParam(name = "format", required = false) String format) {
        ReportFile report = reportService.download(principal.getName(), userId, dateFrom, dateTo, format);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, report.contentType())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(report.filename())
                        .build()
                        .toString())
                .body(report.content());
    }

    @GetMapping("/preview")
    public ReportResponse preview(Principal principal,
                                  @RequestParam(name = "userId", required = false) Long userId,
                                  @RequestParam(name = "dateFrom", required = false) String dateFrom,
                                  @RequestParam(name = "dateTo", required = false) String dateTo) {
        return reportService.preview(principal.getName(), userId, dateFrom, dateTo);
    }
}
