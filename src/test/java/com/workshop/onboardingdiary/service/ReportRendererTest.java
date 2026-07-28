package com.workshop.onboardingdiary.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.workshop.onboardingdiary.dto.FeedbackResponse;
import com.workshop.onboardingdiary.dto.IssueResponse;
import com.workshop.onboardingdiary.dto.NoteResponse;
import com.workshop.onboardingdiary.dto.ReportResponse;
import com.workshop.onboardingdiary.dto.TaskResponse;
import com.workshop.onboardingdiary.entity.FeedbackType;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.TaskPriority;
import com.workshop.onboardingdiary.entity.TaskStatus;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

/** Rendering rules of the report writers and the format parameter (REQUIREMENTS 4.7, 6.1). */
class ReportRendererTest {

    private static final LocalDate FROM = LocalDate.of(2026, 2, 1);
    private static final LocalDate TO = LocalDate.of(2026, 2, 28);

    private final CsvReportRenderer csv = new CsvReportRenderer();
    private final PdfReportRenderer pdf = new PdfReportRenderer();

    @Test
    void theFilenameCarriesTheRecruitNameAndTheRange() {
        ReportResponse report = report(List.of(), List.of(), List.of(), List.of());

        assertThat(ReportRendering.filename(report, ReportFormat.CSV))
                .isEqualTo("onboarding-report-ada-lovelace-2026-02-01-to-2026-02-28.csv");
        assertThat(ReportRendering.filename(report, ReportFormat.PDF))
                .isEqualTo("onboarding-report-ada-lovelace-2026-02-01-to-2026-02-28.pdf");
    }

    @Test
    void aNameWithoutUsableCharactersStillYieldsAFilename() {
        ReportResponse report = ReportResponse.of(1L, "***", FROM, TO, List.of(), List.of(), List.of(), List.of());

        assertThat(ReportRendering.filename(report, ReportFormat.CSV))
                .isEqualTo("onboarding-report-recruit-2026-02-01-to-2026-02-28.csv");
    }

    @Test
    void anUnknownFormatIsAFieldValidationFailure() {
        assertThatThrownBy(() -> ReportFormat.parse("xlsx"))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(thrown -> assertThat(((FieldValidationException) thrown).getErrors())
                        .containsKey("format"));
        assertThatThrownBy(() -> ReportFormat.parse(null)).isInstanceOf(FieldValidationException.class);
        assertThat(ReportFormat.parse(" PDF ")).isEqualTo(ReportFormat.PDF);
    }

    @Test
    void theCsvHasOneSectionPerEntryTypeAndOptionalTextIsBlank() {
        String rendered = new String(csv.render(populatedReport()), StandardCharsets.UTF_8);

        assertThat(rendered).contains("Tasks", "Issues", "Feedback", "Notes");
        assertThat(rendered).contains("Set up laptop", "Missing VPN access", "Great buddy system", "Standup notes");
        assertThat(rendered).contains("onboarding it");
        assertThat(rendered).doesNotContain("null");
    }

    @Test
    void theCsvMarksEveryEmptySectionAndTheEmptyRange() {
        String rendered = new String(csv.render(report(List.of(), List.of(), List.of(), List.of())),
                StandardCharsets.UTF_8);

        assertThat(rendered).contains("No entries in the selected date range");
        assertThat(rendered.lines().filter(line -> line.equals("No entries")).count()).isEqualTo(4);
    }

    @Test
    void thePdfRendersEveryEntryAsExtractableText() throws Exception {
        String text = text(pdf.render(populatedReport()));

        assertThat(text).contains("Onboarding Diary Report", "Ada Lovelace", "2026-02-01 to 2026-02-28");
        assertThat(text).contains("Set up laptop", "Missing VPN access", "Great buddy system", "Standup notes");
        assertThat(text).contains("Tasks (1)", "Issues (1)", "Feedback (1)", "Notes (1)");
    }

    @Test
    void thePdfPaginatesLongReports() throws Exception {
        List<TaskResponse> manyTasks = IntStream.rangeClosed(1, 60)
                .mapToObj(index -> new TaskResponse((long) index, 1L, FROM, "Task number " + index,
                        "A description that is long enough to be wrapped across more than a single rendered line "
                                + "so that the wrapping code is exercised too", "Training",
                        TaskStatus.COMPLETED, TaskPriority.HIGH))
                .toList();
        byte[] rendered = pdf.render(report(manyTasks, List.of(), List.of(), List.of()));

        try (PDDocument document = Loader.loadPDF(rendered)) {
            assertThat(document.getNumberOfPages()).isGreaterThan(1);
            assertThat(new PDFTextStripper().getText(document)).contains("Task number 1", "Task number 60");
        }
    }

    private ReportResponse populatedReport() {
        return report(
                List.of(new TaskResponse(1L, 1L, FROM, "Set up laptop", null, "Training", TaskStatus.COMPLETED,
                        TaskPriority.HIGH)),
                List.of(new IssueResponse(2L, 1L, FROM.plusDays(1), "Missing VPN access", null, IssueSeverity.HIGH,
                        IssueStatus.OPEN, null)),
                List.of(new FeedbackResponse(3L, 1L, FROM.plusDays(2), "Great buddy system", FeedbackType.POSITIVE,
                        "The buddy system helped a lot")),
                List.of(new NoteResponse(4L, 1L, TO, "Standup notes", "Daily standup at 9:30",
                        List.of("onboarding", "it"))));
    }

    private ReportResponse report(List<TaskResponse> tasks, List<IssueResponse> issues,
                                  List<FeedbackResponse> feedback, List<NoteResponse> notes) {
        return ReportResponse.of(1L, "Ada Lovelace", FROM, TO, tasks, issues, feedback, notes);
    }

    private String text(byte[] rendered) throws Exception {
        try (PDDocument document = Loader.loadPDF(rendered)) {
            return new PDFTextStripper().getText(document);
        }
    }
}
