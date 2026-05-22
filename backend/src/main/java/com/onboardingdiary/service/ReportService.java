package com.onboardingdiary.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.onboardingdiary.dto.request.ReportRequest;
import com.onboardingdiary.dto.response.ReportResponse;
import com.onboardingdiary.entity.*;
import com.onboardingdiary.entity.Report;
import com.onboardingdiary.enums.ReportFormat;
import com.onboardingdiary.enums.ReportType;
import com.onboardingdiary.exception.BadRequestException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.*;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReportResponse generate(UUID requesterId, String role, ReportRequest request) {
        UUID targetUserId = request.getUserId() != null ? request.getUserId() : requesterId;

        if (!targetUserId.equals(requesterId) && !role.equals("MANAGER") && !role.equals("ADMIN")) {
            throw new BadRequestException("Only managers and admins can generate reports for other users");
        }

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User targetUser = targetUserId.equals(requesterId) ? requester :
                userRepository.findById(targetUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        if (!targetUserId.equals(requesterId) && role.equals("MANAGER")) {
            if (targetUser.getManager() == null || !targetUser.getManager().getId().equals(requesterId)) {
                throw new BadRequestException("You can only generate reports for recruits assigned to you");
            }
        }

        try {
            String filePath = generateFile(targetUserId, request);

            Report report = Report.builder()
                    .generatedBy(requester)
                    .targetUser(targetUserId.equals(requesterId) ? null : targetUser)
                    .dateFrom(request.getDateFrom())
                    .dateTo(request.getDateTo())
                    .reportType(request.getReportType())
                    .format(request.getFormat())
                    .filePath(filePath)
                    .build();

            report = reportRepository.save(report);
            return ReportResponse.from(report);
        } catch (IOException e) {
            throw new BadRequestException("Failed to generate report: " + e.getMessage());
        }
    }

    public Page<ReportResponse> list(UUID userId, Pageable pageable) {
        return reportRepository.findByGeneratedByIdOrderByCreatedAtDesc(userId, pageable)
                .map(ReportResponse::from);
    }

    public byte[] download(UUID reportId, UUID requesterId) throws IOException {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));

        if (!report.getGeneratedBy().getId().equals(requesterId)) {
            throw new BadRequestException("Access denied");
        }

        Path path = Path.of(report.getFilePath());
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Report file not found");
        }

        return Files.readAllBytes(path);
    }

    public Report getReport(UUID reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
    }

    private String generateFile(UUID userId, ReportRequest request) throws IOException {
        Path reportsDir = Path.of(System.getProperty("java.io.tmpdir"), "onboarding-diary-reports");
        Files.createDirectories(reportsDir);

        String fileName = "report_" + UUID.randomUUID() +
                (request.getFormat() == ReportFormat.PDF ? ".pdf" : ".csv");
        Path filePath = reportsDir.resolve(fileName);

        if (request.getFormat() == ReportFormat.CSV) {
            generateCsv(userId, request, filePath);
        } else {
            generatePdf(userId, request, filePath);
        }

        return filePath.toString();
    }

    private void generateCsv(UUID userId, ReportRequest request, Path filePath) throws IOException {
        PageRequest all = PageRequest.of(0, 10000);
        LocalDate from = request.getDateFrom();
        LocalDate to = request.getDateTo();

        try (com.opencsv.CSVWriter csvWriter = new com.opencsv.CSVWriter(new FileWriter(filePath.toFile()))) {
            ReportType type = request.getReportType();

            if (type == ReportType.TASKS || type == ReportType.COMBINED) {
                csvWriter.writeNext(new String[]{"--- TASKS ---", "", "", "", "", ""});
                csvWriter.writeNext(new String[]{"Date", "Title", "Category", "Status", "Priority", "Description"});
                taskRepository.findByUserWithFilters(userId, from, to, null, null, all)
                        .forEach(t -> csvWriter.writeNext(new String[]{
                                t.getDate().toString(), t.getTitle(), t.getCategory().name(),
                                t.getStatus().name(), t.getPriority().name(),
                                t.getDescription() != null ? t.getDescription() : ""}));
            }

            if (type == ReportType.ISSUES || type == ReportType.COMBINED) {
                csvWriter.writeNext(new String[]{"--- ISSUES ---", "", "", "", "", ""});
                csvWriter.writeNext(new String[]{"Date", "Title", "Severity", "Status", "Description", "Resolution Notes"});
                issueRepository.findByUserWithFilters(userId, from, to, null, null, all)
                        .forEach(i -> csvWriter.writeNext(new String[]{
                                i.getDate().toString(), i.getTitle(), i.getSeverity().name(),
                                i.getStatus().name(), i.getDescription(),
                                i.getResolutionNotes() != null ? i.getResolutionNotes() : ""}));
            }

            if (type == ReportType.FEEDBACK || type == ReportType.COMBINED) {
                csvWriter.writeNext(new String[]{"--- FEEDBACK ---", "", "", ""});
                csvWriter.writeNext(new String[]{"Date", "Subject", "Type", "Details"});
                feedbackRepository.findByUserWithFilters(userId, from, to, null, all)
                        .forEach(f -> csvWriter.writeNext(new String[]{
                                f.getDate().toString(), f.getSubject(), f.getType().name(),
                                f.getDetails()}));
            }
        }
    }

    private void generatePdf(UUID userId, ReportRequest request, Path filePath) throws IOException {
        PageRequest all = PageRequest.of(0, 10000);
        LocalDate from = request.getDateFrom();
        LocalDate to = request.getDateTo();

        Document document = new Document(PageSize.A4);
        try {
            PdfWriter.getInstance(document, new FileOutputStream(filePath.toFile()));
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Font headerFont = new Font(Font.HELVETICA, 12, Font.BOLD);
            Font cellFont = new Font(Font.HELVETICA, 10);

            document.add(new Paragraph("Onboarding Diary Report", titleFont));
            document.add(new Paragraph("Period: " + from + " to " + to, cellFont));
            document.add(new Paragraph(" "));

            ReportType type = request.getReportType();

            if (type == ReportType.TASKS || type == ReportType.COMBINED) {
                document.add(new Paragraph("Tasks", headerFont));
                PdfPTable table = new PdfPTable(5);
                table.setWidthPercentage(100);
                addHeaderCell(table, "Date");
                addHeaderCell(table, "Title");
                addHeaderCell(table, "Category");
                addHeaderCell(table, "Status");
                addHeaderCell(table, "Priority");

                taskRepository.findByUserWithFilters(userId, from, to, null, null, all)
                        .forEach(t -> {
                            table.addCell(new PdfPCell(new Phrase(t.getDate().toString(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(t.getTitle(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(t.getCategory().name(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(t.getStatus().name(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(t.getPriority().name(), cellFont)));
                        });
                document.add(table);
                document.add(new Paragraph(" "));
            }

            if (type == ReportType.ISSUES || type == ReportType.COMBINED) {
                document.add(new Paragraph("Issues", headerFont));
                PdfPTable table = new PdfPTable(4);
                table.setWidthPercentage(100);
                addHeaderCell(table, "Date");
                addHeaderCell(table, "Title");
                addHeaderCell(table, "Severity");
                addHeaderCell(table, "Status");

                issueRepository.findByUserWithFilters(userId, from, to, null, null, all)
                        .forEach(i -> {
                            table.addCell(new PdfPCell(new Phrase(i.getDate().toString(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(i.getTitle(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(i.getSeverity().name(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(i.getStatus().name(), cellFont)));
                        });
                document.add(table);
                document.add(new Paragraph(" "));
            }

            if (type == ReportType.FEEDBACK || type == ReportType.COMBINED) {
                document.add(new Paragraph("Feedback", headerFont));
                PdfPTable table = new PdfPTable(3);
                table.setWidthPercentage(100);
                addHeaderCell(table, "Date");
                addHeaderCell(table, "Subject");
                addHeaderCell(table, "Type");

                feedbackRepository.findByUserWithFilters(userId, from, to, null, all)
                        .forEach(f -> {
                            table.addCell(new PdfPCell(new Phrase(f.getDate().toString(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(f.getSubject(), cellFont)));
                            table.addCell(new PdfPCell(new Phrase(f.getType().name(), cellFont)));
                        });
                document.add(table);
            }
        } catch (DocumentException e) {
            throw new IOException("Failed to generate PDF", e);
        } finally {
            document.close();
        }
    }

    private void addHeaderCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE)));
        cell.setBackgroundColor(new Color(0, 21, 41));
        cell.setPadding(5);
        table.addCell(cell);
    }
}
