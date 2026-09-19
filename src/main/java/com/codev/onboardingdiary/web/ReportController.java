package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.ReportData;
import com.codev.onboardingdiary.service.ReportService;
import com.codev.onboardingdiary.service.ReportType;
import com.codev.onboardingdiary.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class ReportController {

    private final ReportService reportService;
    private final UserService userService;

    public ReportController(ReportService reportService, UserService userService) {
        this.reportService = reportService;
        this.userService = userService;
    }

    @GetMapping("/reports")
    public String reports(@AuthenticationPrincipal AppUserDetails principal, Model model) {
        model.addAttribute("reportTypes", ReportType.values());
        model.addAttribute("reportableUsers", userService.findReportableUsers(principal));
        model.addAttribute("defaultFrom", LocalDate.now().minusMonths(1));
        model.addAttribute("defaultTo", LocalDate.now());
        return "reports";
    }

    /** An unusable date range is user error, so the form is redisplayed with the reason. */
    @ExceptionHandler(IllegalArgumentException.class)
    public String invalidRange(IllegalArgumentException ex,
                               @AuthenticationPrincipal AppUserDetails principal,
                               Model model,
                               HttpServletResponse response) {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        model.addAttribute("errorMessage", ex.getMessage());
        return reports(principal, model);
    }

    @GetMapping("/reports/download/csv")
    public ResponseEntity<byte[]> csv(@AuthenticationPrincipal AppUserDetails principal,
                                      @RequestParam(required = false) Long userId,
                                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                      @RequestParam ReportType type) {
        ReportData data = reportService.build(principal, targetUser(principal, userId), from, to, type);
        return download(reportService.toCsv(data), ReportService.fileName(data, "csv"),
                MediaType.parseMediaType("text/csv"));
    }

    @GetMapping("/reports/download/pdf")
    public ResponseEntity<byte[]> pdf(@AuthenticationPrincipal AppUserDetails principal,
                                      @RequestParam(required = false) Long userId,
                                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                      @RequestParam ReportType type) throws IOException {
        ReportData data = reportService.build(principal, targetUser(principal, userId), from, to, type);
        return download(reportService.toPdf(data), ReportService.fileName(data, "pdf"), MediaType.APPLICATION_PDF);
    }

    /** An absent userId always means "my own diary"; any supplied id is scope-checked in the service. */
    private static Long targetUser(AppUserDetails principal, Long userId) {
        return userId == null ? principal.getId() : userId;
    }

    private static ResponseEntity<byte[]> download(byte[] body, String fileName, MediaType mediaType) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(mediaType)
                .body(body);
    }
}
