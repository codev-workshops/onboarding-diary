package com.onboardingdiary.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.onboardingdiary.entity.*;
import com.onboardingdiary.repository.*;
import com.opencsv.CSVWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReportService {

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final FeedbackEntryRepository feedbackEntryRepository;
    private final NoteEntryRepository noteEntryRepository;

    public ReportService(TaskEntryRepository taskEntryRepository,
                         IssueEntryRepository issueEntryRepository,
                         FeedbackEntryRepository feedbackEntryRepository,
                         NoteEntryRepository noteEntryRepository) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.feedbackEntryRepository = feedbackEntryRepository;
        this.noteEntryRepository = noteEntryRepository;
    }

    public byte[] generateReport(String type, String format, LocalDate dateFrom, LocalDate dateTo, Long recruitId) {
        if ("pdf".equalsIgnoreCase(format)) {
            return generatePdf(type, dateFrom, dateTo, recruitId);
        } else {
            return generateCsv(type, dateFrom, dateTo, recruitId);
        }
    }

    private byte[] generatePdf(String type, LocalDate dateFrom, LocalDate dateTo, Long recruitId) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            document.add(new Paragraph("Onboarding Diary Report")
                    .setFontSize(20).setBold());
            document.add(new Paragraph("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)));
            document.add(new Paragraph("Date Range: " + dateFrom + " to " + dateTo));
            document.add(new Paragraph(" "));

            if ("tasks".equalsIgnoreCase(type) || "combined".equalsIgnoreCase(type)) {
                addTasksTable(document, recruitId, dateFrom, dateTo);
            }
            if ("issues".equalsIgnoreCase(type) || "combined".equalsIgnoreCase(type)) {
                addIssuesTable(document, recruitId, dateFrom, dateTo);
            }
            if ("feedback".equalsIgnoreCase(type) || "combined".equalsIgnoreCase(type)) {
                addFeedbackTable(document, recruitId, dateFrom, dateTo);
            }

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF report", e);
        }
    }

    private void addTasksTable(Document document, Long recruitId, LocalDate dateFrom, LocalDate dateTo) {
        document.add(new Paragraph("Tasks").setFontSize(16).setBold());
        List<TaskEntry> tasks = taskEntryRepository.findByUserIdAndDateBetween(recruitId, dateFrom, dateTo);

        Table table = new Table(new float[]{2, 3, 3, 2, 2});
        table.addHeaderCell(new Cell().add(new Paragraph("Date").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Title").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Category").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Status").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Priority").setBold()));

        for (TaskEntry task : tasks) {
            table.addCell(task.getDate().toString());
            table.addCell(task.getTitle());
            table.addCell(task.getCategory() != null ? task.getCategory() : "");
            table.addCell(task.getStatus() != null ? task.getStatus().name() : "");
            table.addCell(task.getPriority() != null ? task.getPriority().name() : "");
        }
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addIssuesTable(Document document, Long recruitId, LocalDate dateFrom, LocalDate dateTo) {
        document.add(new Paragraph("Issues").setFontSize(16).setBold());
        List<IssueEntry> issues = issueEntryRepository.findByUserIdAndDateBetween(recruitId, dateFrom, dateTo);

        Table table = new Table(new float[]{2, 3, 2, 2});
        table.addHeaderCell(new Cell().add(new Paragraph("Date").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Title").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Severity").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Status").setBold()));

        for (IssueEntry issue : issues) {
            table.addCell(issue.getDate().toString());
            table.addCell(issue.getTitle());
            table.addCell(issue.getSeverity() != null ? issue.getSeverity().name() : "");
            table.addCell(issue.getStatus() != null ? issue.getStatus().name() : "");
        }
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private void addFeedbackTable(Document document, Long recruitId, LocalDate dateFrom, LocalDate dateTo) {
        document.add(new Paragraph("Feedback").setFontSize(16).setBold());
        List<FeedbackEntry> feedbackList = feedbackEntryRepository.findByUserIdAndDateBetween(recruitId, dateFrom, dateTo);

        Table table = new Table(new float[]{2, 3, 2, 4});
        table.addHeaderCell(new Cell().add(new Paragraph("Date").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Subject").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Type").setBold()));
        table.addHeaderCell(new Cell().add(new Paragraph("Details").setBold()));

        for (FeedbackEntry fb : feedbackList) {
            table.addCell(fb.getDate().toString());
            table.addCell(fb.getSubject());
            table.addCell(fb.getType() != null ? fb.getType().name() : "");
            table.addCell(fb.getDetails());
        }
        document.add(table);
        document.add(new Paragraph(" "));
    }

    private byte[] generateCsv(String type, LocalDate dateFrom, LocalDate dateTo, Long recruitId) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            CSVWriter csvWriter = new CSVWriter(new OutputStreamWriter(baos));

            if ("tasks".equalsIgnoreCase(type) || "combined".equalsIgnoreCase(type)) {
                csvWriter.writeNext(new String[]{"Type", "Date", "Title", "Description", "Category", "Status", "Priority"});
                List<TaskEntry> tasks = taskEntryRepository.findByUserIdAndDateBetween(recruitId, dateFrom, dateTo);
                for (TaskEntry t : tasks) {
                    csvWriter.writeNext(new String[]{
                            "Task", t.getDate().toString(), t.getTitle(), t.getDescription(),
                            t.getCategory() != null ? t.getCategory() : "",
                            t.getStatus() != null ? t.getStatus().name() : "",
                            t.getPriority() != null ? t.getPriority().name() : ""
                    });
                }
            }

            if ("issues".equalsIgnoreCase(type) || "combined".equalsIgnoreCase(type)) {
                csvWriter.writeNext(new String[]{"Type", "Date", "Title", "Description", "Severity", "Status", "Resolution Notes"});
                List<IssueEntry> issues = issueEntryRepository.findByUserIdAndDateBetween(recruitId, dateFrom, dateTo);
                for (IssueEntry i : issues) {
                    csvWriter.writeNext(new String[]{
                            "Issue", i.getDate().toString(), i.getTitle(), i.getDescription(),
                            i.getSeverity() != null ? i.getSeverity().name() : "",
                            i.getStatus() != null ? i.getStatus().name() : "",
                            i.getResolutionNotes() != null ? i.getResolutionNotes() : ""
                    });
                }
            }

            if ("feedback".equalsIgnoreCase(type) || "combined".equalsIgnoreCase(type)) {
                csvWriter.writeNext(new String[]{"Type", "Date", "Subject", "Feedback Type", "Details"});
                List<FeedbackEntry> feedbackList = feedbackEntryRepository.findByUserIdAndDateBetween(recruitId, dateFrom, dateTo);
                for (FeedbackEntry f : feedbackList) {
                    csvWriter.writeNext(new String[]{
                            "Feedback", f.getDate().toString(), f.getSubject(),
                            f.getType() != null ? f.getType().name() : "",
                            f.getDetails()
                    });
                }
            }

            csvWriter.flush();
            csvWriter.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generating CSV report", e);
        }
    }
}
