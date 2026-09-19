package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.Task;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Component;

@Component
public class PdfReportWriter {

    private static final float MARGIN = 45f;
    private static final float LINE_HEIGHT = 14f;
    private static final float BODY_SIZE = 9f;

    public byte[] write(ReportData data) throws IOException {
        List<String> lines = renderLines(data);
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            List<List<String>> pages = paginate(lines);
            for (int pageIndex = 0; pageIndex < pages.size(); pageIndex++) {
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                    float y = page.getMediaBox().getHeight() - MARGIN;
                    content.beginText();
                    content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 15f);
                    content.newLineAtOffset(MARGIN, y);
                    content.showText("Onboarding Diary Report");
                    content.endText();
                    y -= LINE_HEIGHT * 1.6f;

                    content.beginText();
                    content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), BODY_SIZE);
                    content.newLineAtOffset(MARGIN, y);
                    content.setLeading(LINE_HEIGHT);
                    for (String line : pages.get(pageIndex)) {
                        content.showText(sanitize(line));
                        content.newLine();
                    }
                    content.endText();

                    content.beginText();
                    content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE), 8f);
                    content.newLineAtOffset(MARGIN, MARGIN / 2);
                    content.showText("Page " + (pageIndex + 1) + " of " + pages.size());
                    content.endText();
                }
            }
            document.save(out);
            return out.toByteArray();
        }
    }

    private List<String> renderLines(ReportData data) {
        List<String> lines = new ArrayList<>();
        lines.add("User: " + data.userName() + " (" + data.userEmail() + ")");
        lines.add("Report type: " + data.type().name());
        lines.add("Date range: " + data.from() + " to " + data.to());
        lines.add("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        lines.add("");

        if (data.type().includesTasks()) {
            lines.add("TASKS (" + data.tasks().size() + ")");
            lines.add("----------------------------------------------------------------");
            if (data.tasks().isEmpty()) {
                lines.add("No tasks in this date range.");
            }
            for (Task task : data.tasks()) {
                lines.add(task.getDate() + "  " + task.getTitle());
                lines.add("    category: " + task.getCategory() + " | status: " + task.getStatus()
                        + " | priority: " + task.getPriority());
                addWrapped(lines, task.getDescription());
            }
            lines.add("");
        }
        if (data.type().includesIssues()) {
            lines.add("ISSUES (" + data.issues().size() + ")");
            lines.add("----------------------------------------------------------------");
            if (data.issues().isEmpty()) {
                lines.add("No issues in this date range.");
            }
            for (Issue issue : data.issues()) {
                lines.add(issue.getDate() + "  " + issue.getTitle());
                lines.add("    severity: " + issue.getSeverity() + " | status: " + issue.getStatus());
                addWrapped(lines, issue.getDescription());
                if (issue.getResolutionNotes() != null && !issue.getResolutionNotes().isBlank()) {
                    addWrapped(lines, "Resolution: " + issue.getResolutionNotes());
                }
            }
            lines.add("");
        }
        if (data.type().includesFeedback()) {
            lines.add("FEEDBACK (" + data.feedback().size() + ")");
            lines.add("----------------------------------------------------------------");
            if (data.feedback().isEmpty()) {
                lines.add("No feedback in this date range.");
            }
            for (Feedback feedback : data.feedback()) {
                lines.add(feedback.getDate() + "  " + feedback.getSubject() + " [" + feedback.getType() + "]");
                addWrapped(lines, feedback.getDetails());
            }
        }
        return lines;
    }

    private void addWrapped(List<String> lines, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        String flat = text.replaceAll("\\s+", " ").trim();
        int width = 95;
        for (int start = 0; start < flat.length(); start += width) {
            lines.add("    " + flat.substring(start, Math.min(flat.length(), start + width)));
        }
    }

    private List<List<String>> paginate(List<String> lines) {
        int linesPerPage = 48;
        List<List<String>> pages = new ArrayList<>();
        for (int start = 0; start < lines.size(); start += linesPerPage) {
            pages.add(new ArrayList<>(lines.subList(start, Math.min(lines.size(), start + linesPerPage))));
        }
        if (pages.isEmpty()) {
            pages.add(List.of("No entries."));
        }
        return pages;
    }

    /** Standard 14 fonts only cover WinAnsi; replace anything outside it so generation cannot fail. */
    static String sanitize(String text) {
        StringBuilder builder = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            builder.append(c >= 32 && c < 127 ? c : '?');
        }
        return builder.toString();
    }
}
