package com.codev.onboardingdiary.report;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** RFC 4180 CSV with spreadsheet formula injection neutralised. */
@Component
public class CsvRenderer {

  public byte[] render(ReportTable table) {
    StringBuilder csv = new StringBuilder();
    appendRow(csv, table.headers());
    table.rows().forEach(row -> appendRow(csv, row));
    return csv.toString().getBytes(StandardCharsets.UTF_8);
  }

  private static void appendRow(StringBuilder csv, List<String> cells) {
    csv.append(cells.stream().map(CsvRenderer::escape).collect(Collectors.joining(",")));
    csv.append("\r\n");
  }

  static String escape(String value) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    String safe = "=+-@\t\r".indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
    if (safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r")) {
      return "\"" + safe.replace("\"", "\"\"") + "\"";
    }
    return safe;
  }
}
