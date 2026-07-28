package com.workshop.onboardingdiary.search;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import java.time.LocalDate;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

/**
 * Search correctness over a fixture seeded across every searched field of REQUIREMENTS 9.2:
 * substring and case-insensitive matching, the tag join, null optional fields and the per-group cap.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SearchContentTest {

    /** A capped excerpt is 200 characters of text plus the two ellipsis markers around it. */
    private static final int CAPPED_EXCERPT_LENGTH = 202;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    private User owner;
    private String token;

    @BeforeEach
    void setUp() {
        owner = testUsers.create("search-content@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(owner.getEmail(), owner.getRole());

        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 1), "Read the Onboarding handbook", null);
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 2), "Set up laptop",
                "Install the toolchain and the VPN client");
        testEntries.issueWithText(owner, LocalDate.of(2026, 2, 3), "Onboarding portal is down", null, null);
        testEntries.issueWithText(owner, LocalDate.of(2026, 2, 4), "Build fails",
                "The nightly pipeline breaks on a flaky test", "Reran with a pinned dependency version");
        testEntries.feedbackWithText(owner, LocalDate.of(2026, 2, 5), "Onboarding week went well",
                "The buddy system helped a lot");
        testEntries.feedbackWithText(owner, LocalDate.of(2026, 2, 6), "Documentation",
                "The deployment runbook is out of date");
        testEntries.noteWithText(owner, LocalDate.of(2026, 2, 7), "Onboarding links",
                "Wiki pages worth bookmarking", "reference");
        testEntries.noteWithText(owner, LocalDate.of(2026, 2, 8), "Standup notes",
                "Team meets at nine every morning", "meetings", "team");
    }

    private ResultActions search(String query) throws Exception {
        return mockMvc.perform(get("/api/search").param("q", query)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    @Test
    void aQueryMatchesTheHeadlineFieldOfEveryEntryType() throws Exception {
        search("onboarding")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.totalResults").value(4))
                .andExpect(jsonPath("$.results.tasks.items[0].title").value("Read the Onboarding handbook"))
                .andExpect(jsonPath("$.results.tasks.items[0].type").value("TASK"))
                .andExpect(jsonPath("$.results.issues.items[0].title").value("Onboarding portal is down"))
                .andExpect(jsonPath("$.results.feedback.items[0].title").value("Onboarding week went well"))
                .andExpect(jsonPath("$.results.notes.items[0].title").value("Onboarding links"));
    }

    @Test
    void aQueryMatchesTheTaskDescription() throws Exception {
        search("toolchain")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(1))
                .andExpect(jsonPath("$.results.tasks.items[0].title").value("Set up laptop"))
                .andExpect(jsonPath("$.results.tasks.items[0].excerpt",
                        Matchers.containsString("Install the toolchain")));
    }

    @Test
    void aQueryMatchesTheIssueDescriptionAndResolutionNotes() throws Exception {
        search("nightly pipeline")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.issues.count").value(1))
                .andExpect(jsonPath("$.results.issues.items[0].title").value("Build fails"));

        search("pinned dependency")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.issues.count").value(1))
                .andExpect(jsonPath("$.results.issues.items[0].excerpt",
                        Matchers.containsString("pinned dependency")));
    }

    @Test
    void aQueryMatchesTheFeedbackDetailsAndTheNoteContent() throws Exception {
        search("buddy system")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.feedback.count").value(1))
                .andExpect(jsonPath("$.results.feedback.items[0].title").value("Onboarding week went well"));

        search("bookmarking")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.notes.count").value(1))
                .andExpect(jsonPath("$.results.notes.items[0].title").value("Onboarding links"));
    }

    @Test
    void matchingIsCaseInsensitiveAndMatchesMidField() throws Exception {
        search("RUNBOOK")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.feedback.count").value(1))
                .andExpect(jsonPath("$.results.feedback.items[0].title").value("Documentation"));

        search("ightly pipel")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.issues.count").value(1));
    }

    @Test
    void aNoteMatchesOnATagSubstringAndIsReturnedOnce() throws Exception {
        testEntries.noteWithText(owner, LocalDate.of(2026, 2, 9), "Retro", "Nothing to add here",
                "retrospective", "retro-actions");

        search("retro")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.notes.count").value(1))
                .andExpect(jsonPath("$.results.notes.items[0].title").value("Retro"))
                .andExpect(jsonPath("$.results.notes.items", Matchers.hasSize(1)));

        search("ETINGS")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.notes.count").value(1))
                .andExpect(jsonPath("$.results.notes.items[0].title").value("Standup notes"));
    }

    @Test
    void aQueryThatMatchesNothingReturnsEmptyGroups() throws Exception {
        search("kubernetes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.results.tasks.items", Matchers.hasSize(0)))
                .andExpect(jsonPath("$.results.issues.items", Matchers.hasSize(0)))
                .andExpect(jsonPath("$.results.feedback.items", Matchers.hasSize(0)))
                .andExpect(jsonPath("$.results.notes.items", Matchers.hasSize(0)))
                .andExpect(jsonPath("$.results.tasks.truncated").value(false));
    }

    @Test
    void nullOptionalFieldsDoNotMatchAndDoNotBreakTheQuery() throws Exception {
        search("handbook")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.tasks.count").value(1))
                .andExpect(jsonPath("$.results.issues.count").value(0))
                .andExpect(jsonPath("$.results.tasks.items[0].excerpt").value("Read the Onboarding handbook"));
    }

    @Test
    void aGroupIsCappedAtFiftyRowsAndReportsTruncation() throws Exception {
        for (int index = 0; index < 51; index++) {
            testEntries.taskWithText(owner, LocalDate.of(2026, 3, 1), "Repeated widget task " + index, null);
        }

        search("widget")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.tasks.count").value(50))
                .andExpect(jsonPath("$.results.tasks.items", Matchers.hasSize(50)))
                .andExpect(jsonPath("$.results.tasks.truncated").value(true))
                .andExpect(jsonPath("$.totalResults").value(50))
                .andExpect(jsonPath("$.results.issues.truncated").value(false));
    }

    @Test
    void anExcerptIsCappedAroundTheFirstMatch() throws Exception {
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 10), "Long write-up",
                "lorem ".repeat(60) + "needle " + "ipsum ".repeat(60));

        search("needle")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.tasks.count").value(1))
                .andExpect(jsonPath("$.results.tasks.items[0].excerpt", Matchers.containsString("needle")))
                .andExpect(jsonPath("$.results.tasks.items[0].excerpt",
                        Matchers.hasLength(CAPPED_EXCERPT_LENGTH)));
    }
}
