package com.codev.onboardingdiary.report;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CsvRendererTest {

  @Test
  void neutralisesFormulasEvenAfterLeadingWhitespace() {
    assertThat(CsvRenderer.escape("=SUM(A1)")).isEqualTo("'=SUM(A1)");
    assertThat(CsvRenderer.escape("  =SUM(A1)")).isEqualTo("'  =SUM(A1)");
    assertThat(CsvRenderer.escape(" @cmd")).isEqualTo("' @cmd");
    assertThat(CsvRenderer.escape("\tvalue")).isEqualTo("'\tvalue");
  }

  @Test
  void leavesPlainTextAndQuotesSeparators() {
    assertThat(CsvRenderer.escape("  plain")).isEqualTo("  plain");
    assertThat(CsvRenderer.escape("a,b")).isEqualTo("\"a,b\"");
    assertThat(CsvRenderer.escape("   ")).isEqualTo("   ");
  }
}
