package com.codev.onboardingdiary.report;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CsvReportWriterTest {

  @Test
  void quotesFieldsPerRfc4180() {
    assertThat(CsvReportWriter.escape("plain")).isEqualTo("plain");
    assertThat(CsvReportWriter.escape("a,b")).isEqualTo("\"a,b\"");
    assertThat(CsvReportWriter.escape("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
    assertThat(CsvReportWriter.escape("two\nlines")).isEqualTo("\"two\nlines\"");
    assertThat(CsvReportWriter.escape(null)).isEmpty();
  }

  @Test
  void neutralisesFormulas() {
    assertThat(CsvReportWriter.escape("=SUM(A1)")).isEqualTo("'=SUM(A1)");
    assertThat(CsvReportWriter.escape("+1")).isEqualTo("'+1");
    assertThat(CsvReportWriter.escape("-2")).isEqualTo("'-2");
    assertThat(CsvReportWriter.escape("@cmd")).isEqualTo("'@cmd");
    assertThat(CsvReportWriter.escape("=1,2")).isEqualTo("\"'=1,2\"");
  }
}
