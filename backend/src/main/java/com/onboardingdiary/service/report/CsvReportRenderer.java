package com.onboardingdiary.service.report;

import com.onboardingdiary.dto.ReportData;
import com.onboardingdiary.dto.ReportData.Section;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Renders a {@link ReportData} as CSV. Multi-section (combined) reports emit a
 * section-name banner row before each table, separated by a blank line.
 */
@Component
public class CsvReportRenderer {

    public byte[] render(ReportData report) {
        StringBuilder sb = new StringBuilder();
        boolean multi = report.sections().size() > 1;

        for (int s = 0; s < report.sections().size(); s++) {
            Section section = report.sections().get(s);
            if (s > 0) {
                sb.append("\r\n");
            }
            if (multi) {
                sb.append(escape("# " + section.name())).append("\r\n");
            }
            sb.append(joinRow(section.headers())).append("\r\n");
            for (List<String> row : section.rows()) {
                sb.append(joinRow(row)).append("\r\n");
            }
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String joinRow(List<String> cells) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(escape(cells.get(i)));
        }
        return sb.toString();
    }

    /** RFC-4180 quoting: wrap in quotes when the value contains a comma, quote, or newline. */
    private String escape(String value) {
        String v = value == null ? "" : value;
        if (v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r")) {
            return "\"" + v.replace("\"", "\"\"") + "\"";
        }
        return v;
    }
}
