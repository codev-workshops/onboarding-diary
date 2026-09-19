package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.FeedbackFilter;
import com.codev.onboardingdiary.web.dto.IssueFilter;
import com.codev.onboardingdiary.web.dto.TaskFilter;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final TaskService taskService;
    private final IssueService issueService;
    private final FeedbackService feedbackService;
    private final AuthorizationService authorizationService;
    private final CsvReportWriter csvReportWriter;
    private final PdfReportWriter pdfReportWriter;

    public ReportService(TaskService taskService,
                         IssueService issueService,
                         FeedbackService feedbackService,
                         AuthorizationService authorizationService,
                         CsvReportWriter csvReportWriter,
                         PdfReportWriter pdfReportWriter) {
        this.taskService = taskService;
        this.issueService = issueService;
        this.feedbackService = feedbackService;
        this.authorizationService = authorizationService;
        this.csvReportWriter = csvReportWriter;
        this.pdfReportWriter = pdfReportWriter;
    }

    public ReportData build(AppUserDetails principal, Long targetUserId, LocalDate from, LocalDate to, ReportType type) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("Both start and end date are required");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("Start date must be before end date");
        }
        User target = authorizationService.requireReadAccess(principal, targetUserId);
        List<Task> tasks = type.includesTasks()
                ? taskService.listForOwner(target.getId(), new TaskFilter(from, to, null, null))
                : List.of();
        List<Issue> issues = type.includesIssues()
                ? issueService.listForOwner(target.getId(), new IssueFilter(from, to, null, null))
                : List.of();
        List<Feedback> feedback = type.includesFeedback()
                ? feedbackService.listForOwner(target.getId(), new FeedbackFilter(from, to, null))
                : List.of();
        return new ReportData(target.getName(), target.getEmail(), from, to, type, tasks, issues, feedback);
    }

    public byte[] toCsv(ReportData data) {
        return csvReportWriter.write(data);
    }

    public byte[] toPdf(ReportData data) throws IOException {
        return pdfReportWriter.write(data);
    }

    public static String fileName(ReportData data, String extension) {
        String user = data.userEmail().replaceAll("[^a-zA-Z0-9]", "_");
        return "onboarding-diary-" + data.type().name().toLowerCase(java.util.Locale.ROOT)
                + "-" + user + "-" + data.from() + "_" + data.to() + "." + extension;
    }
}
