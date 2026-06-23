package com.onboardingdiary.controller;

import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.ManagerRecruitAssignmentRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;
    private final ManagerRecruitAssignmentRepository assignmentRepository;

    public ReportController(ReportService reportService, UserRepository userRepository,
                            ManagerRecruitAssignmentRepository assignmentRepository) {
        this.reportService = reportService;
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
    }

    @GetMapping
    public ResponseEntity<byte[]> generateReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String type,
            @RequestParam String format,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam Long recruitId) {

        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (currentUser.getRole() == Role.MANAGER) {
            if (!assignmentRepository.existsByManagerIdAndRecruitId(currentUser.getId(), recruitId)) {
                throw new UnauthorizedException("You can only generate reports for your assigned recruits");
            }
        }

        byte[] reportData = reportService.generateReport(type, format, dateFrom, dateTo, recruitId);

        String contentType;
        String filename;
        if ("pdf".equalsIgnoreCase(format)) {
            contentType = "application/pdf";
            filename = "report_" + type + ".pdf";
        } else {
            contentType = "text/csv";
            filename = "report_" + type + ".csv";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(reportData);
    }
}
