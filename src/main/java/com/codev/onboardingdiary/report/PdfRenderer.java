package com.codev.onboardingdiary.report;

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
import org.springframework.stereotype.Component;

/** Landscape A4 PDF with a title block and one table. */
@Component
public class PdfRenderer {

  private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
  private static final Font META = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
  private static final Font HEADER = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
  private static final Font CELL = FontFactory.getFont(FontFactory.HELVETICA, 8);
  private static final Color HEADER_BG = new Color(0x2f, 0x5d, 0x8a);

  public byte[] render(ReportTable table) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Document document = new Document(PageSize.A4.rotate(), 30, 30, 30, 30);
    PdfWriter.getInstance(document, out);
    document.open();
    document.add(new Paragraph(table.title(), TITLE));
    document.add(
        new Paragraph(
            "Recruit: " + table.recruitName() + "    Period: " + table.from() + " to " + table.to()
                + "    Entries: " + table.rows().size(),
            META));
    document.add(new Paragraph(" "));
    if (table.rows().isEmpty()) {
      document.add(new Paragraph("No entries in this period.", CELL));
    } else {
      document.add(buildTable(table));
    }
    document.close();
    return out.toByteArray();
  }

  private static PdfPTable buildTable(ReportTable table) {
    PdfPTable pdfTable = new PdfPTable(table.headers().size());
    pdfTable.setWidthPercentage(100);
    pdfTable.setHeaderRows(1);
    for (String header : table.headers()) {
      PdfPCell cell = new PdfPCell(new Phrase(header, HEADER));
      cell.setBackgroundColor(HEADER_BG);
      cell.setPadding(4);
      pdfTable.addCell(cell);
    }
    for (var row : table.rows()) {
      for (String value : row) {
        PdfPCell cell = new PdfPCell(new Phrase(value == null ? "" : value, CELL));
        cell.setPadding(3);
        cell.setVerticalAlignment(Element.ALIGN_TOP);
        pdfTable.addCell(cell);
      }
    }
    return pdfTable;
  }
}
