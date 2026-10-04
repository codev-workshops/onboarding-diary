package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.report.ReportRow.RecordType;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.IOException;
import java.io.OutputStream;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Renders a report as an A4 landscape PDF with a header, summary and one table per category. */
@Component
public class PdfReportWriter {

  private static final int MAX_CELL_LENGTH = 500;
  private static final Color HEADER_BG = new Color(25, 118, 210);
  private static final Font TITLE = new Font(Font.HELVETICA, 16, Font.BOLD);
  private static final Font HEADING = new Font(Font.HELVETICA, 12, Font.BOLD);
  private static final Font NORMAL = new Font(Font.HELVETICA, 9);
  private static final Font BOLD = new Font(Font.HELVETICA, 9, Font.BOLD);
  private static final Font TABLE_HEADER = new Font(Font.HELVETICA, 8, Font.BOLD, Color.WHITE);
  private static final Font CELL = new Font(Font.HELVETICA, 8);
  private static final DateTimeFormatter TIMESTAMP =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'").withZone(ZoneOffset.UTC);

  public void write(ReportData data, OutputStream out) throws IOException {
    Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 48);
    try {
      PdfWriter writer = PdfWriter.getInstance(document, out);
      writer.setPageEvent(new PageNumbers());
      document.addTitle("Onboarding report");
      document.open();
      writeHeader(document, data);
      writeSummary(document, data);
      for (RecordType section : data.sections()) {
        writeSection(document, data, section);
      }
      document.close();
    } catch (DocumentException ex) {
      throw new IOException("Could not render PDF report", ex);
    }
  }

  private void writeHeader(Document document, ReportData data) throws DocumentException {
    document.add(new Paragraph(data.organization(), TITLE));
    document.add(new Paragraph(label(data.type()) + " report", HEADING));
    document.add(Chunk.NEWLINE);
    PdfPTable details = new PdfPTable(new float[] {1, 3});
    details.setWidthPercentage(60);
    details.setHorizontalAlignment(Element.ALIGN_LEFT);
    if (data.scope() == ReportScope.SELF && data.subjects().size() == 1) {
      ReportSubject subject = data.subjects().get(0);
      addDetail(details, "Recruit", subject.fullName() + " (" + subject.email() + ")");
      addDetail(details, "Department", subject.department());
      addDetail(details, "Start date", subject.startDate().toString());
      addDetail(details, "Manager", subject.managerName() == null ? "—" : subject.managerName());
    } else {
      addDetail(
          details,
          "Scope",
          (data.scope() == ReportScope.ALL ? "All recruits" : "My team")
              + " ("
              + data.subjects().size()
              + " recruits)");
    }
    addDetail(details, "Date range", data.from() + " to " + data.to());
    addDetail(
        details, "Generated", TIMESTAMP.format(data.generatedAt()) + " by " + data.generatedBy());
    document.add(details);
  }

  private void writeSummary(Document document, ReportData data) throws DocumentException {
    document.add(new Paragraph("Summary", HEADING));
    List<ReportRow> tasks = data.rowsOf(RecordType.TASK);
    List<ReportRow> issues = data.rowsOf(RecordType.ISSUE);
    List<ReportRow> feedback = data.rowsOf(RecordType.FEEDBACK);
    long completed = tasks.stream().filter(t -> "COMPLETED".equals(t.status())).count();
    long open =
        issues.stream()
            .filter(i -> "OPEN".equals(i.status()) || "IN_PROGRESS".equals(i.status()))
            .count();
    PdfPTable summary = new PdfPTable(2);
    summary.setWidthPercentage(60);
    summary.setHorizontalAlignment(Element.ALIGN_LEFT);
    summary.setSpacingBefore(4);
    for (RecordType section : data.sections()) {
      switch (section) {
        case TASK ->
            addDetail(
                summary,
                "Tasks",
                tasks.size()
                    + " logged, "
                    + completed
                    + " completed ("
                    + percent(completed, tasks.size())
                    + ")");
        case ISSUE ->
            addDetail(summary, "Issues", issues.size() + " logged, " + open + " still open");
        case FEEDBACK ->
            addDetail(summary, "Feedback", feedback.size() + " entries" + byType(feedback));
      }
    }
    document.add(summary);
  }

  private void writeSection(Document document, ReportData data, RecordType section)
      throws DocumentException {
    List<ReportRow> rows = data.rowsOf(section);
    Paragraph heading = new Paragraph(sectionTitle(section) + " (" + rows.size() + ")", HEADING);
    heading.setSpacingBefore(14);
    heading.setSpacingAfter(4);
    document.add(heading);
    if (rows.isEmpty()) {
      document.add(new Paragraph("No entries in this period.", NORMAL));
      return;
    }
    List<ReportColumn> columns = ReportColumn.forPdfSection(section, data.multiRecruit());
    float[] widths = new float[columns.size()];
    for (int i = 0; i < widths.length; i++) {
      widths[i] = columns.get(i).width();
    }
    PdfPTable table = new PdfPTable(widths);
    table.setWidthPercentage(100);
    table.setHeaderRows(1);
    for (ReportColumn column : columns) {
      PdfPCell cell = new PdfPCell(new Phrase(column.label(), TABLE_HEADER));
      cell.setBackgroundColor(HEADER_BG);
      cell.setPadding(4);
      table.addCell(cell);
    }
    for (ReportRow row : rows) {
      for (ReportColumn column : columns) {
        PdfPCell cell = new PdfPCell(new Phrase(truncate(column.value().apply(row)), CELL));
        cell.setPadding(3);
        table.addCell(cell);
      }
    }
    document.add(table);
  }

  private static void addDetail(PdfPTable table, String label, String value) {
    PdfPCell labelCell = new PdfPCell(new Phrase(label, BOLD));
    PdfPCell valueCell = new PdfPCell(new Phrase(value, NORMAL));
    labelCell.setBorder(PdfPCell.NO_BORDER);
    valueCell.setBorder(PdfPCell.NO_BORDER);
    table.addCell(labelCell);
    table.addCell(valueCell);
  }

  private static String byType(List<ReportRow> feedback) {
    if (feedback.isEmpty()) {
      return "";
    }
    Map<String, Long> counts =
        feedback.stream()
            .collect(Collectors.groupingBy(ReportRow::feedbackType, Collectors.counting()));
    return counts.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .map(entry -> entry.getValue() + " " + entry.getKey().toLowerCase())
        .collect(Collectors.joining(", ", " (", ")"));
  }

  private static String percent(long part, long total) {
    return total == 0 ? "0%" : Math.round(part * 1000.0 / total) / 10.0 + "%";
  }

  private static String truncate(String value) {
    if (value == null) {
      return "";
    }
    return value.length() > MAX_CELL_LENGTH ? value.substring(0, MAX_CELL_LENGTH) + "…" : value;
  }

  private static String label(ReportType type) {
    Function<String, String> capitalize = name -> name.charAt(0) + name.substring(1).toLowerCase();
    return capitalize.apply(type.name());
  }

  private static String sectionTitle(RecordType section) {
    return switch (section) {
      case TASK -> "Tasks";
      case ISSUE -> "Issues";
      case FEEDBACK -> "Feedback";
    };
  }

  private static final class PageNumbers extends PdfPageEventHelper {
    @Override
    public void onEndPage(PdfWriter writer, Document document) {
      ColumnText.showTextAligned(
          writer.getDirectContent(),
          Element.ALIGN_CENTER,
          new Phrase("Page " + writer.getPageNumber(), CELL),
          (document.left() + document.right()) / 2,
          document.bottom() - 20,
          0);
    }
  }
}
