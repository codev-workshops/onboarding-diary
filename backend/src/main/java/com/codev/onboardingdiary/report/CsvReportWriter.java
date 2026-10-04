package com.codev.onboardingdiary.report;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Writes RFC 4180 CSV with a UTF-8 byte order mark, streaming row by row. Cells that a spreadsheet
 * would evaluate as formulas are prefixed with an apostrophe.
 */
@Component
public class CsvReportWriter {

  private static final String CRLF = "\r\n";

  public void write(ReportData data, OutputStream out) throws IOException {
    List<ReportColumn> columns = ReportColumn.forType(data.type(), data.multiRecruit());
    Writer writer = new BufferedWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8));
    writer.write('\uFEFF');
    writeLine(writer, columns.stream().map(ReportColumn::key).toList());
    for (ReportRow row : data.rows()) {
      writeLine(writer, columns.stream().map(column -> column.value().apply(row)).toList());
    }
    writer.flush();
  }

  private static void writeLine(Writer writer, List<String> cells) throws IOException {
    for (int i = 0; i < cells.size(); i++) {
      if (i > 0) {
        writer.write(',');
      }
      writer.write(escape(cells.get(i)));
    }
    writer.write(CRLF);
  }

  static String escape(String value) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    String safe = isFormula(value) ? "'" + value : value;
    boolean quote =
        safe.indexOf(',') >= 0
            || safe.indexOf('"') >= 0
            || safe.indexOf('\n') >= 0
            || safe.indexOf('\r') >= 0;
    return quote ? '"' + safe.replace("\"", "\"\"") + '"' : safe;
  }

  private static boolean isFormula(String value) {
    char first = value.charAt(0);
    return first == '='
        || first == '+'
        || first == '-'
        || first == '@'
        || first == '\t'
        || first == '\r';
  }
}
