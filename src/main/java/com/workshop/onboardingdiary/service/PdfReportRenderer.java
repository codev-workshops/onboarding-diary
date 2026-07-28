package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.ReportResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName;
import org.springframework.stereotype.Component;

/**
 * PDF report writer (decision D6, Apache PDFBox): a formatted document with one section per entry
 * type, laid out as a paginated list of lines.
 */
@Component
class PdfReportRenderer {

    private static final float MARGIN = 50f;
    private static final float LINE_HEIGHT = 15f;
    private static final float BODY_SIZE = 10f;
    private static final float HEADING_SIZE = 13f;
    private static final float TITLE_SIZE = 16f;
    private static final int MAX_LINE_CHARS = 95;

    /** A single rendered line: its text plus the size and weight it is drawn with. */
    private record Line(String text, float size, boolean bold) {
    }

    byte[] render(ReportResponse report) {
        List<Line> lines = lines(report);
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            write(document, lines);
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not write the PDF report", e);
        }
    }

    private void write(PDDocument document, List<Line> lines) throws IOException {
        PDPage page = newPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);
        float y = page.getMediaBox().getHeight() - MARGIN;
        for (Line line : lines) {
            if (y < MARGIN) {
                content.close();
                page = newPage(document);
                content = new PDPageContentStream(document, page);
                y = page.getMediaBox().getHeight() - MARGIN;
            }
            content.beginText();
            content.setFont(new PDType1Font(line.bold() ? FontName.HELVETICA_BOLD : FontName.HELVETICA), line.size());
            content.newLineAtOffset(MARGIN, y);
            content.showText(line.text());
            content.endText();
            y -= LINE_HEIGHT;
        }
        content.close();
    }

    private PDPage newPage(PDDocument document) {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        return page;
    }

    private List<Line> lines(ReportResponse report) {
        List<Line> lines = new ArrayList<>();
        lines.add(new Line(ReportRendering.TITLE, TITLE_SIZE, true));
        lines.add(body("Recruit: " + report.recruitName()));
        lines.add(body("Date range: " + report.dateFrom() + " to " + report.dateTo()));
        lines.add(body("Entries: " + report.totalEntries()));
        lines.add(body(""));
        if (report.totalEntries() == 0) {
            lines.add(new Line(ReportRendering.NO_ENTRIES_IN_RANGE, HEADING_SIZE, true));
            lines.add(body(""));
        }

        section(lines, "Tasks", report.tasks().stream()
                .map(task -> List.of(
                        task.entryDate() + "  " + task.title(),
                        "Category: " + task.category() + "  Status: " + task.status()
                                + "  Priority: " + task.priority(),
                        "Description: " + ReportRendering.text(task.description())))
                .toList());

        section(lines, "Issues", report.issues().stream()
                .map(issue -> List.of(
                        issue.entryDate() + "  " + issue.title(),
                        "Severity: " + issue.severity() + "  Status: " + issue.status(),
                        "Description: " + ReportRendering.text(issue.description()),
                        "Resolution notes: " + ReportRendering.text(issue.resolutionNotes())))
                .toList());

        section(lines, "Feedback", report.feedback().stream()
                .map(feedback -> List.of(
                        feedback.entryDate() + "  " + feedback.subject(),
                        "Type: " + feedback.type(),
                        "Details: " + feedback.details()))
                .toList());

        section(lines, "Notes", report.notes().stream()
                .map(note -> List.of(
                        note.entryDate() + "  " + note.title(),
                        "Tags: " + String.join(", ", note.tags()),
                        "Content: " + note.content()))
                .toList());
        return lines;
    }

    private void section(List<Line> lines, String heading, List<List<String>> entries) {
        lines.add(new Line(heading + " (" + entries.size() + ")", HEADING_SIZE, true));
        if (entries.isEmpty()) {
            lines.add(body(ReportRendering.NO_ENTRIES));
        }
        for (List<String> entry : entries) {
            entry.forEach(part -> wrap(part).forEach(part2 -> lines.add(body(part2))));
            lines.add(body(""));
        }
        lines.add(body(""));
    }

    private Line body(String text) {
        return new Line(sanitise(text), BODY_SIZE, false);
    }

    /** Long values are wrapped so nothing runs off the page. */
    private List<String> wrap(String text) {
        List<String> wrapped = new ArrayList<>();
        String remaining = text;
        while (remaining.length() > MAX_LINE_CHARS) {
            int cut = remaining.lastIndexOf(' ', MAX_LINE_CHARS);
            if (cut <= 0) {
                cut = MAX_LINE_CHARS;
            }
            wrapped.add(remaining.substring(0, cut));
            remaining = remaining.substring(cut).stripLeading();
        }
        wrapped.add(remaining);
        return wrapped;
    }

    /** The standard 14 fonts only encode WinAnsi; anything else is replaced rather than failing. */
    private String sanitise(String text) {
        StringBuilder sanitised = new StringBuilder(text.length());
        for (char character : text.toCharArray()) {
            sanitised.append(character == '\n' || character == '\r' || character == '\t' ? ' '
                    : character < 32 || character > 255 ? '?' : character);
        }
        return sanitised.toString();
    }
}
