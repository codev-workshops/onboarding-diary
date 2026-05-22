package com.onboardingdiary.controller;

import com.onboardingdiary.dto.request.ReportRequest;
import com.onboardingdiary.dto.response.ReportResponse;
import com.onboardingdiary.entity.Report;
import com.onboardingdiary.enums.ReportFormat;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/generate")
    public ResponseEntity<ReportResponse> generate(@AuthenticationPrincipal UserPrincipal principal,
                                                     @Valid @RequestBody ReportRequest request) {
        return ResponseEntity.ok(reportService.generate(principal.getId(), principal.getRole(), request));
    }

    @GetMapping
    public ResponseEntity<Page<ReportResponse>> list(@AuthenticationPrincipal UserPrincipal principal,
                                                      @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(reportService.list(principal.getId(), pageable));
    }

    @GetMapping("/{reportId}/download")
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal UserPrincipal principal,
                                            @PathVariable UUID reportId) throws IOException {
        Report report = reportService.getReport(reportId);
        byte[] data = reportService.download(reportId, principal.getId());

        String contentType = report.getFormat() == ReportFormat.PDF
                ? MediaType.APPLICATION_PDF_VALUE
                : "text/csv";
        String extension = report.getFormat() == ReportFormat.PDF ? ".pdf" : ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report" + extension)
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }
}
