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

  /** True when a spreadsheet could treat the value as a formula, even after leading spaces. */
  static boolean startsLikeFormula(String value) {
    if ("\t\r".indexOf(value.charAt(0)) >= 0) {
      return true;
    }
    String trimmed = value.stripLeading();
    return !trimmed.isEmpty() && "=+-@".indexOf(trimmed.charAt(0)) >= 0;
  }

  static String escape(String value) {
    if (value == null || value.isEmpty()) {
      return "";
    }
    String safe = startsLikeFormula(value) ? "'" + value : value;
    if (safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r")) {
      return "\"" + safe.replace("\"", "\"\"") + "\"";
    }
    return safe;
  }
}
