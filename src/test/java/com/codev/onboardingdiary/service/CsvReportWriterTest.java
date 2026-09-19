package com.codev.onboardingdiary.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.FeedbackType;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.Priority;
import com.codev.onboardingdiary.domain.Severity;
import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.TaskStatus;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class CsvReportWriterTest {

    private final CsvReportWriter writer = new CsvReportWriter();

    @Test
    void combinedReportContainsEverySection() {
        Task task = new Task();
        task.setDate(LocalDate.of(2026, 1, 5));
        task.setTitle("Set up laptop");
        task.setCategory("Setup");
        task.setStatus(TaskStatus.COMPLETED);
        task.setPriority(Priority.HIGH);
        task.setDescription("Installed tooling");

        Issue issue = new Issue();
        issue.setDate(LocalDate.of(2026, 1, 6));
        issue.setTitle("VPN fails");
        issue.setSeverity(Severity.HIGH);
        issue.setStatus(IssueStatus.OPEN);
        issue.setDescription("Cannot connect");

        Feedback feedback = new Feedback();
        feedback.setDate(LocalDate.of(2026, 1, 7));
        feedback.setSubject("Great buddy system");
        feedback.setType(FeedbackType.POSITIVE);
        feedback.setDetails("Helpful");

        ReportData data = new ReportData("Rita Recruit", "rita@example.com", LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), ReportType.COMBINED, List.of(task), List.of(issue), List.of(feedback));

        String csv = new String(writer.write(data), StandardCharsets.UTF_8);

        assertThat(csv).contains("Rita Recruit", "rita@example.com", "2026-01-01", "2026-01-31", "COMBINED");
        assertThat(csv).contains("TASKS", "Set up laptop", "COMPLETED");
        assertThat(csv).contains("ISSUES", "VPN fails", "HIGH");
        assertThat(csv).contains("FEEDBACK", "Great buddy system", "POSITIVE");
    }

    @Test
    void taskOnlyReportOmitsOtherSections() {
        ReportData data = new ReportData("Rita", "rita@example.com", LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31), ReportType.TASKS, List.of(), List.of(), List.of());

        String csv = new String(writer.write(data), StandardCharsets.UTF_8);

        assertThat(csv).contains("TASKS");
        assertThat(csv).doesNotContain("ISSUES");
        assertThat(csv).doesNotContain("FEEDBACK");
    }

    @Test
    void separatorsAndQuotesAreEscaped() {
        assertThat(CsvReportWriter.escape("plain")).isEqualTo("\"plain\"");
        assertThat(CsvReportWriter.escape("a,b")).isEqualTo("\"a,b\"");
        assertThat(CsvReportWriter.escape("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
        assertThat(CsvReportWriter.escape("line1\nline2")).isEqualTo("\"line1 line2\"");
        assertThat(CsvReportWriter.escape(null)).isEmpty();
    }
}
