package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.ReportResponse;
import java.io.IOException;
import java.io.StringWriter;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Component;

/**
 * CSV report writer (decision D6, Apache Commons CSV): one section with its own header row per
 * entry type, as assumed in REQUIREMENTS 8.1 item 7.
 */
@Component
class CsvReportRenderer {

    byte[] render(ReportResponse report) {
        StringWriter writer = new StringWriter();
        try (CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT)) {
            printer.printRecord(ReportRendering.TITLE);
            printer.printRecord("Recruit", report.recruitName());
            printer.printRecord("Date range", report.dateFrom().toString(), report.dateTo().toString());
            printer.printRecord("Entries", report.totalEntries());
            printer.println();
            if (report.totalEntries() == 0) {
                printer.printRecord(ReportRendering.NO_ENTRIES_IN_RANGE);
                printer.println();
            }

            printer.printRecord("Tasks");
            printer.printRecord("Date", "Title", "Description", "Category", "Status", "Priority");
            if (report.tasks().isEmpty()) {
                printer.printRecord(ReportRendering.NO_ENTRIES);
            }
            for (var task : report.tasks()) {
                printer.printRecord(task.entryDate(), task.title(), ReportRendering.text(task.description()),
                        task.category(), task.status(), task.priority());
            }
            printer.println();

            printer.printRecord("Issues");
            printer.printRecord("Date", "Title", "Description", "Severity", "Status", "Resolution notes");
            if (report.issues().isEmpty()) {
                printer.printRecord(ReportRendering.NO_ENTRIES);
            }
            for (var issue : report.issues()) {
                printer.printRecord(issue.entryDate(), issue.title(), ReportRendering.text(issue.description()),
                        issue.severity(), issue.status(), ReportRendering.text(issue.resolutionNotes()));
            }
            printer.println();

            printer.printRecord("Feedback");
            printer.printRecord("Date", "Subject", "Type", "Details");
            if (report.feedback().isEmpty()) {
                printer.printRecord(ReportRendering.NO_ENTRIES);
            }
            for (var feedback : report.feedback()) {
                printer.printRecord(feedback.entryDate(), feedback.subject(), feedback.type(),
                        ReportRendering.text(feedback.details()));
            }
            printer.println();

            printer.printRecord("Notes");
            printer.printRecord("Date", "Title", "Content", "Tags");
            if (report.notes().isEmpty()) {
                printer.printRecord(ReportRendering.NO_ENTRIES);
            }
            for (var note : report.notes()) {
                printer.printRecord(note.entryDate(), note.title(), ReportRendering.text(note.content()),
                        String.join(" ", note.tags()));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not write the CSV report", e);
        }
        return writer.toString().getBytes(StandardCharsets.UTF_8);
    }
}
