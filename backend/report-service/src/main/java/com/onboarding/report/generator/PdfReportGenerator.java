package com.onboarding.report.generator;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashSet;
import org.springframework.stereotype.Component;

@Component
public class PdfReportGenerator {

    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
    private static final Font SUBTITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 12, Color.DARK_GRAY);
    private static final Font SECTION_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(51, 102, 153));
    private static final Font HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
    private static final Font CELL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

    private static final Color HEADER_BG = new Color(51, 102, 153);
    private static final Color ROW_EVEN = new Color(240, 240, 240);
    private static final Color ROW_ODD = Color.WHITE;

    public byte[] generate(String dateFrom, String dateTo, String generatedAt,
                           Map<String, List<Map<String, Object>>> data) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Paragraph title = new Paragraph("Onboarding Diary Report", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(10);
            document.add(title);

            Paragraph dateRange = new Paragraph(
                    "Period: " + dateFrom + " to " + dateTo, SUBTITLE_FONT);
            dateRange.setAlignment(Element.ALIGN_CENTER);
            document.add(dateRange);

            Paragraph generated = new Paragraph(
                    "Generated: " + generatedAt, SUBTITLE_FONT);
            generated.setAlignment(Element.ALIGN_CENTER);
            generated.setSpacingAfter(20);
            document.add(generated);

            for (Map.Entry<String, List<Map<String, Object>>> entry : data.entrySet()) {
                addSection(document, entry.getKey(), entry.getValue());
            }

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }

        return baos.toByteArray();
    }

    private void addSection(Document document, String category, List<Map<String, Object>> items) {
        try {
            Paragraph sectionTitle = new Paragraph(category, SECTION_FONT);
            sectionTitle.setSpacingBefore(15);
            sectionTitle.setSpacingAfter(10);
            document.add(sectionTitle);

            if (items.isEmpty()) {
                document.add(new Paragraph("No data available for this category.", CELL_FONT));
                return;
            }

            Set<String> columns = new LinkedHashSet<>();
            for (Map<String, Object> item : items) {
                columns.addAll(item.keySet());
            }

            PdfPTable table = new PdfPTable(columns.size());
            table.setWidthPercentage(100);

            for (String col : columns) {
                PdfPCell headerCell = new PdfPCell(new Phrase(col, HEADER_FONT));
                headerCell.setBackgroundColor(HEADER_BG);
                headerCell.setPadding(5);
                headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(headerCell);
            }

            int rowIndex = 0;
            for (Map<String, Object> item : items) {
                Color bgColor = (rowIndex % 2 == 0) ? ROW_EVEN : ROW_ODD;
                for (String col : columns) {
                    Object value = item.get(col);
                    PdfPCell cell = new PdfPCell(new Phrase(
                            value != null ? value.toString() : "", CELL_FONT));
                    cell.setBackgroundColor(bgColor);
                    cell.setPadding(4);
                    table.addCell(cell);
                }
                rowIndex++;
            }

            document.add(table);
        } catch (Exception e) {
            throw new RuntimeException("Failed to add section to PDF: " + category, e);
        }
    }
}
