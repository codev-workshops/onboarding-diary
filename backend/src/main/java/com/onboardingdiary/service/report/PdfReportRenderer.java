package com.onboardingdiary.service.report;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.onboardingdiary.dto.ReportData;
import com.onboardingdiary.dto.ReportData.Section;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Renders a {@link ReportData} as a tabular PDF document using OpenPDF.
 */
@Component
public class PdfReportRenderer {

    private static final DateTimeFormatter TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
    private static final Font META_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
    private static final Font SECTION_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    private static final Font HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
    private static final Font CELL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9);

    public byte[] render(ReportData report) {
        Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph(report.title(), TITLE_FONT);
            document.add(title);

            document.add(new Paragraph(metaLine(report), META_FONT));
            document.add(new Paragraph(" "));

            for (Section section : report.sections()) {
                addSection(document, section);
            }

            document.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to render PDF report", e);
        }
        return out.toByteArray();
    }

    private String metaLine(ReportData report) {
        String range;
        if (report.dateFrom() == null && report.dateTo() == null) {
            range = "all dates";
        } else {
            range = (report.dateFrom() == null ? "…" : report.dateFrom().toString())
                    + " to " + (report.dateTo() == null ? "…" : report.dateTo().toString());
        }
        return "Date range: " + range + "    Generated: " + TIMESTAMP.format(report.generatedAt());
    }

    private void addSection(Document document, Section section) throws DocumentException {
        Paragraph heading = new Paragraph(section.name(), SECTION_FONT);
        heading.setSpacingBefore(8);
        heading.setSpacingAfter(4);
        document.add(heading);

        if (section.rows().isEmpty()) {
            document.add(new Paragraph("No records.", CELL_FONT));
            return;
        }

        PdfPTable table = new PdfPTable(section.headers().size());
        table.setWidthPercentage(100);

        for (String header : section.headers()) {
            PdfPCell cell = new PdfPCell(new Phrase(header, HEADER_FONT));
            cell.setBackgroundColor(new Color(31, 95, 176));
            cell.setPadding(4);
            cell.setHorizontalAlignment(Element.ALIGN_LEFT);
            table.addCell(cell);
        }

        for (List<String> row : section.rows()) {
            for (String value : row) {
                PdfPCell cell = new PdfPCell(new Phrase(value, CELL_FONT));
                cell.setPadding(3);
                table.addCell(cell);
            }
        }
        document.add(table);
    }
}
