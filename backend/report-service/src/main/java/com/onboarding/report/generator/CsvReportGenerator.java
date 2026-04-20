package com.onboarding.report.generator;

import com.opencsv.CSVWriter;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class CsvReportGenerator {

    public byte[] generate(String dateFrom, String dateTo, String generatedAt,
                           Map<String, List<Map<String, Object>>> data) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (CSVWriter writer = new CSVWriter(
                new OutputStreamWriter(baos, StandardCharsets.UTF_8))) {

            writer.writeNext(new String[]{"Onboarding Diary Report"});
            writer.writeNext(new String[]{"Period", dateFrom + " to " + dateTo});
            writer.writeNext(new String[]{"Generated", generatedAt});
            writer.writeNext(new String[]{});

            for (Map.Entry<String, List<Map<String, Object>>> entry : data.entrySet()) {
                writeSection(writer, entry.getKey(), entry.getValue());
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate CSV report", e);
        }

        return baos.toByteArray();
    }

    private void writeSection(CSVWriter writer, String category, List<Map<String, Object>> items) {
        writer.writeNext(new String[]{"--- " + category + " ---"});

        if (items.isEmpty()) {
            writer.writeNext(new String[]{"No data available"});
            writer.writeNext(new String[]{});
            return;
        }

        Set<String> columns = new LinkedHashSet<>();
        for (Map<String, Object> item : items) {
            columns.addAll(item.keySet());
        }

        String[] headers = columns.toArray(new String[0]);
        writer.writeNext(headers);

        for (Map<String, Object> item : items) {
            String[] row = new String[columns.size()];
            int i = 0;
            for (String col : columns) {
                Object value = item.get(col);
                row[i++] = value != null ? value.toString() : "";
            }
            writer.writeNext(row);
        }

        writer.writeNext(new String[]{});
    }
}
