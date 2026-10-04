package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Report preview and download; access is scoped by {@link ReportAccessPolicy}. */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  private final ReportService service;
  private final CsvReportWriter csvWriter;
  private final PdfReportWriter pdfWriter;

  public ReportController(
      ReportService service, CsvReportWriter csvWriter, PdfReportWriter pdfWriter) {
    this.service = service;
    this.csvWriter = csvWriter;
    this.pdfWriter = pdfWriter;
  }

  @GetMapping("/preview")
  public ReportPreview preview(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam ReportType type,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) Long userId,
      @RequestParam(defaultValue = "SELF") ReportScope scope) {
    return service.preview(
        principal, new ReportService.Request(type, null, from, to, userId, scope));
  }

  @GetMapping("/download")
  public void download(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam ReportType type,
      @RequestParam ReportFormat format,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) Long userId,
      @RequestParam(defaultValue = "SELF") ReportScope scope,
      HttpServletResponse response)
      throws IOException {
    ReportData data =
        service.generate(
            principal, new ReportService.Request(type, format, from, to, userId, scope));
    response.setContentType(
        format == ReportFormat.PDF ? MediaType.APPLICATION_PDF_VALUE : "text/csv; charset=UTF-8");
    response.setHeader(
        HttpHeaders.CONTENT_DISPOSITION,
        ContentDisposition.attachment()
            .filename(ReportService.fileName(data, format), StandardCharsets.UTF_8)
            .build()
            .toString());
    response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    if (format == ReportFormat.PDF) {
      pdfWriter.write(data, response.getOutputStream());
    } else {
      csvWriter.write(data, response.getOutputStream());
    }
  }
}
