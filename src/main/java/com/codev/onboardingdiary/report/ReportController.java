package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.user.CurrentUser;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Report downloads for recruits (self), managers (assigned recruits) and admins. */
@RestController
public class ReportController {

  private final ReportService reports;
  private final CsvRenderer csv;
  private final PdfRenderer pdf;
  private final CurrentUser currentUser;

  public ReportController(
      ReportService reports, CsvRenderer csv, PdfRenderer pdf, CurrentUser currentUser) {
    this.reports = reports;
    this.csv = csv;
    this.pdf = pdf;
    this.currentUser = currentUser;
  }

  @GetMapping("/api/reports")
  ResponseEntity<byte[]> download(
      @RequestParam(required = false) Long recruitId,
      @RequestParam LocalDate from,
      @RequestParam LocalDate to,
      @RequestParam ReportType type,
      @RequestParam ReportFormat format) {
    ReportTable table = reports.build(currentUser.get(), recruitId, from, to, type);
    byte[] body = format == ReportFormat.PDF ? pdf.render(table) : csv.render(table);
    String filename =
        String.format(
            "onboarding-%s-%s-%s-to-%s.%s",
            type.name().toLowerCase(Locale.ROOT),
            slug(table.recruitName()),
            from,
            to,
            format.extension());
    return ResponseEntity.ok()
        .contentType(format.mediaType())
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(filename).build().toString())
        .body(body);
  }

  private static String slug(String name) {
    String slug = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
    return slug.replaceAll("(^-|-$)", "");
  }
}
