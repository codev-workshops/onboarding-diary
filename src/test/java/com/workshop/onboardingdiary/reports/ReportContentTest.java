package com.workshop.onboardingdiary.reports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.onboardingdiary.entity.FeedbackType;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Report content over a fixture dataset spanning the range boundaries (REQUIREMENTS 4.7, US-R11):
 * both formats download with the right headers and carry exactly the in-range entries.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReportContentTest {

    private static final String FROM = "2026-02-01";
    private static final String TO = "2026-02-28";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    private User recruit;
    private String token;

    @BeforeEach
    void setUp() {
        recruit = testUsers.create("report-content@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
    }

    /** Four in-range entries, one per type, plus one out-of-range entry on each side of the range. */
    private void seedDataset() {
        testEntries.task(recruit, LocalDate.of(2026, 2, 1), "In range task", "Training", TaskStatus.COMPLETED);
        testEntries.issue(recruit, LocalDate.of(2026, 2, 14), "In range issue", IssueStatus.OPEN, IssueSeverity.HIGH);
        testEntries.feedback(recruit, LocalDate.of(2026, 2, 20), "In range feedback", FeedbackType.POSITIVE);
        testEntries.note(recruit, LocalDate.of(2026, 2, 28), "In range note", "onboarding");

        testEntries.task(recruit, LocalDate.of(2026, 1, 31), "Before range task", "Training", TaskStatus.NOT_STARTED);
        testEntries.issue(recruit, LocalDate.of(2026, 3, 1), "After range issue", IssueStatus.OPEN, IssueSeverity.LOW);
        testEntries.feedback(recruit, LocalDate.of(2026, 1, 20), "Before range feedback", FeedbackType.CONCERN);
        testEntries.note(recruit, LocalDate.of(2026, 3, 15), "After range note", "later");
    }

    @Test
    void thePreviewContainsOnlyTheInRangeEntries() throws Exception {
        seedDataset();

        mockMvc.perform(get("/api/reports/preview?dateFrom=" + FROM + "&dateTo=" + TO)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(recruit.getId()))
                .andExpect(jsonPath("$.recruitName").value(recruit.getName()))
                .andExpect(jsonPath("$.dateFrom").value(FROM))
                .andExpect(jsonPath("$.dateTo").value(TO))
                .andExpect(jsonPath("$.totalEntries").value(4))
                .andExpect(jsonPath("$.tasks.length()").value(1))
                .andExpect(jsonPath("$.tasks[0].title").value("In range task"))
                .andExpect(jsonPath("$.issues.length()").value(1))
                .andExpect(jsonPath("$.issues[0].title").value("In range issue"))
                .andExpect(jsonPath("$.feedback.length()").value(1))
                .andExpect(jsonPath("$.feedback[0].subject").value("In range feedback"))
                .andExpect(jsonPath("$.notes.length()").value(1))
                .andExpect(jsonPath("$.notes[0].title").value("In range note"));
    }

    @Test
    void theCsvDownloadCarriesTheInRangeEntriesAndExcludesTheRest() throws Exception {
        seedDataset();

        byte[] body = mockMvc.perform(download("csv"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"onboarding-report-test-user-2026-02-01-to-2026-02-28.csv\""))
                .andReturn().getResponse().getContentAsByteArray();

        String csv = new String(body, StandardCharsets.UTF_8);
        assertThat(csv).isNotEmpty();
        assertThat(csv).contains("Onboarding Diary Report", "Test User", FROM, TO);
        assertThat(csv).contains("Tasks", "Issues", "Feedback", "Notes");
        assertThat(csv).contains("In range task", "In range issue", "In range feedback", "In range note");
        assertThat(csv).doesNotContain("Before range task", "After range issue", "Before range feedback",
                "After range note");
        assertThat(csv).doesNotContain("No entries");
    }

    @Test
    void thePdfDownloadCarriesTheInRangeEntriesAndExcludesTheRest() throws Exception {
        seedDataset();

        byte[] body = mockMvc.perform(download("pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"onboarding-report-test-user-2026-02-01-to-2026-02-28.pdf\""))
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(body).isNotEmpty();
        String text = pdfText(body);
        assertThat(text).contains("Onboarding Diary Report", "Test User", FROM + " to " + TO);
        assertThat(text).contains("Tasks (1)", "Issues (1)", "Feedback (1)", "Notes (1)");
        assertThat(text).contains("In range task", "In range issue", "In range feedback", "In range note");
        assertThat(text).doesNotContain("Before range task", "After range issue", "Before range feedback",
                "After range note");
        assertThat(text).doesNotContain("No entries");
    }

    @Test
    void anEmptyRangeStillProducesACsvReportSayingSo() throws Exception {
        seedDataset();

        byte[] body = mockMvc.perform(get("/api/reports?dateFrom=2026-04-01&dateTo=2026-04-30&format=csv")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv"))
                .andReturn().getResponse().getContentAsByteArray();

        String csv = new String(body, StandardCharsets.UTF_8);
        assertThat(csv).isNotEmpty();
        assertThat(csv).contains("No entries in the selected date range");
        assertThat(csv).doesNotContain("In range task");
    }

    @Test
    void anEmptyRangeStillProducesAPdfReportSayingSo() throws Exception {
        seedDataset();

        byte[] body = mockMvc.perform(get("/api/reports?dateFrom=2026-04-01&dateTo=2026-04-30&format=pdf")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(body).isNotEmpty();
        String text = pdfText(body);
        assertThat(text).contains("No entries in the selected date range");
        assertThat(text).contains("Tasks (0)", "Issues (0)", "Feedback (0)", "Notes (0)");
        assertThat(text).doesNotContain("In range task");
    }

    @Test
    void theEmptyPreviewIsAnEmptyReportRatherThanAnError() throws Exception {
        seedDataset();

        mockMvc.perform(get("/api/reports/preview?dateFrom=2026-04-01&dateTo=2026-04-30")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEntries").value(0))
                .andExpect(jsonPath("$.tasks.length()").value(0))
                .andExpect(jsonPath("$.issues.length()").value(0))
                .andExpect(jsonPath("$.feedback.length()").value(0))
                .andExpect(jsonPath("$.notes.length()").value(0));
    }

    @Test
    void theRangeBoundariesAreInclusive() throws Exception {
        testEntries.task(recruit, LocalDate.of(2026, 2, 1), "First day task", "Training", TaskStatus.NOT_STARTED);
        testEntries.task(recruit, LocalDate.of(2026, 2, 28), "Last day task", "Training", TaskStatus.COMPLETED);

        String csv = new String(mockMvc.perform(download("csv"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);

        assertThat(csv).contains("First day task", "Last day task");
    }

    private RequestBuilder download(String format) {
        return get("/api/reports?dateFrom=" + FROM + "&dateTo=" + TO + "&format=" + format)
                .header("Authorization", "Bearer " + token);
    }

    private String pdfText(byte[] pdf) throws Exception {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }
}
