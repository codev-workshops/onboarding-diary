package com.workshop.onboardingdiary.dashboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dashboard aggregation over a deterministic dataset: counts, task completion, open issues and the
 * 10 most recent entries (REQUIREMENTS 4.6, US-R10, decision D7).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DashboardIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    private User recruit;
    private String token;

    @BeforeEach
    void setUp() {
        recruit = testUsers.create("dashboard-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
    }

    @Test
    void summaryCountsEveryEntryTypeOfTheOwner() throws Exception {
        seedDataset();
        User otherRecruit = testUsers.create("dashboard-other@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        testEntries.task(otherRecruit, LocalDate.of(2026, 2, 1), "Not mine", "Training", TaskStatus.COMPLETED);
        testEntries.issue(otherRecruit, LocalDate.of(2026, 2, 1), "Not mine", IssueStatus.OPEN, IssueSeverity.HIGH);

        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(recruit.getId()))
                .andExpect(jsonPath("$.counts.tasks").value(5))
                .andExpect(jsonPath("$.counts.issues").value(4))
                .andExpect(jsonPath("$.counts.feedbackNotes").value(2))
                .andExpect(jsonPath("$.counts.additionalNotes").value(3));
    }

    @Test
    void taskCompletionIsCompletedOverTotalRoundedToAWholePercent() throws Exception {
        seedDataset();

        // 2 of 5 tasks completed over all time: 40%.
        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletion.completedTasks").value(2))
                .andExpect(jsonPath("$.taskCompletion.totalTasks").value(5))
                .andExpect(jsonPath("$.taskCompletion.percentComplete").value(40));
    }

    @Test
    void taskCompletionRoundsToTheNearestWholePercent() throws Exception {
        testEntries.task(recruit, LocalDate.of(2026, 2, 1), "One", "Training", TaskStatus.COMPLETED);
        testEntries.task(recruit, LocalDate.of(2026, 2, 2), "Two", "Training", TaskStatus.NOT_STARTED);
        testEntries.task(recruit, LocalDate.of(2026, 2, 3), "Three", "Training", TaskStatus.BLOCKED);

        // 1 of 3 is 33.33%, which rounds to 33.
        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletion.percentComplete").value(33));

        testEntries.task(recruit, LocalDate.of(2026, 2, 4), "Four", "Training", TaskStatus.COMPLETED);
        testEntries.task(recruit, LocalDate.of(2026, 2, 5), "Five", "Training", TaskStatus.COMPLETED);

        // 3 of 5 is 60%.
        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletion.percentComplete").value(60));
    }

    @Test
    void taskCompletionIgnoresTheEntryDateSoItCoversAllTime() throws Exception {
        testEntries.task(recruit, LocalDate.of(2026, 1, 6), "Old completed", "Training", TaskStatus.COMPLETED);
        testEntries.task(recruit, LocalDate.of(2026, 6, 1), "Recent open", "Training", TaskStatus.IN_PROGRESS);

        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletion.completedTasks").value(1))
                .andExpect(jsonPath("$.taskCompletion.totalTasks").value(2))
                .andExpect(jsonPath("$.taskCompletion.percentComplete").value(50));
    }

    @Test
    void anEmptyDiaryReturnsZeroCountsAndZeroPercentWithoutDividingByZero() throws Exception {
        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.tasks").value(0))
                .andExpect(jsonPath("$.counts.issues").value(0))
                .andExpect(jsonPath("$.counts.feedbackNotes").value(0))
                .andExpect(jsonPath("$.counts.additionalNotes").value(0))
                .andExpect(jsonPath("$.taskCompletion.completedTasks").value(0))
                .andExpect(jsonPath("$.taskCompletion.totalTasks").value(0))
                .andExpect(jsonPath("$.taskCompletion.percentComplete").value(0))
                .andExpect(jsonPath("$.openIssues.length()").value(0))
                .andExpect(jsonPath("$.recentEntries.length()").value(0));
    }

    @Test
    void openIssuesListsOnlyOpenAndInProgressIssuesLatestFirst() throws Exception {
        seedDataset();

        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openIssues.length()").value(2))
                .andExpect(jsonPath("$.openIssues[0].title").value("Issue in progress"))
                .andExpect(jsonPath("$.openIssues[0].status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.openIssues[1].title").value("Issue open"))
                .andExpect(jsonPath("$.openIssues[1].status").value("OPEN"));
    }

    @Test
    void openIssuesExcludesEveryStatusAtTheResolvedBoundary() throws Exception {
        testEntries.issue(recruit, LocalDate.of(2026, 2, 1), "Resolved", IssueStatus.RESOLVED, IssueSeverity.LOW);
        testEntries.issue(recruit, LocalDate.of(2026, 2, 2), "Closed", IssueStatus.CLOSED, IssueSeverity.LOW);

        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.issues").value(2))
                .andExpect(jsonPath("$.openIssues.length()").value(0));
    }

    @Test
    void recentEntriesAreTheTenLatestAcrossAllFourTypesLatestFirst() throws Exception {
        seedDataset();

        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentEntries.length()").value(10))
                .andExpect(jsonPath("$.recentEntries[0].type").value("NOTE"))
                .andExpect(jsonPath("$.recentEntries[0].entryDate").value("2026-03-14"))
                .andExpect(jsonPath("$.recentEntries[1].type").value("FEEDBACK"))
                .andExpect(jsonPath("$.recentEntries[1].entryDate").value("2026-03-13"))
                .andExpect(jsonPath("$.recentEntries[2].type").value("ISSUE"))
                .andExpect(jsonPath("$.recentEntries[2].entryDate").value("2026-03-12"))
                .andExpect(jsonPath("$.recentEntries[3].type").value("TASK"))
                .andExpect(jsonPath("$.recentEntries[3].entryDate").value("2026-03-11"))
                .andExpect(jsonPath("$.recentEntries[4].type").value("NOTE"))
                .andExpect(jsonPath("$.recentEntries[4].entryDate").value("2026-03-10"))
                .andExpect(jsonPath("$.recentEntries[5].type").value("FEEDBACK"))
                .andExpect(jsonPath("$.recentEntries[5].entryDate").value("2026-03-09"))
                .andExpect(jsonPath("$.recentEntries[6].type").value("ISSUE"))
                .andExpect(jsonPath("$.recentEntries[6].entryDate").value("2026-03-08"))
                .andExpect(jsonPath("$.recentEntries[7].type").value("TASK"))
                .andExpect(jsonPath("$.recentEntries[7].entryDate").value("2026-03-07"))
                .andExpect(jsonPath("$.recentEntries[8].type").value("NOTE"))
                .andExpect(jsonPath("$.recentEntries[8].entryDate").value("2026-03-06"))
                .andExpect(jsonPath("$.recentEntries[9].type").value("ISSUE"))
                .andExpect(jsonPath("$.recentEntries[9].entryDate").value("2026-03-05"))
                // the two oldest entries of the 12 fall outside the window
                .andExpect(jsonPath("$.recentEntries[*].entryDate")
                        .value(Matchers.not(Matchers.hasItem("2026-03-04"))));
    }

    @Test
    void entriesOnTheSameDateAreOrderedByTheirCreationTimestamp() throws Exception {
        LocalDate sameDate = LocalDate.of(2026, 3, 1);
        long earlierTask = testEntries.task(recruit, sameDate, "Created first", "Training", TaskStatus.COMPLETED)
                .getId();
        long laterFeedback = testEntries.feedback(recruit, sameDate, "Created second", FeedbackType.POSITIVE).getId();
        setCreatedAt("task_entry", earlierTask, Instant.parse("2026-03-01T08:00:00Z"));
        setCreatedAt("feedback_note", laterFeedback, Instant.parse("2026-03-01T09:00:00Z"));

        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentEntries.length()").value(2))
                .andExpect(jsonPath("$.recentEntries[0].title").value("Created second"))
                .andExpect(jsonPath("$.recentEntries[1].title").value("Created first"));
    }

    @Test
    void recentEntriesReflectOnlyTheOwnersData() throws Exception {
        User otherRecruit = testUsers.create("dashboard-neighbour@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        testEntries.task(otherRecruit, LocalDate.of(2026, 4, 1), "Somebody else's task", "Training",
                TaskStatus.COMPLETED);
        testEntries.task(recruit, LocalDate.of(2026, 2, 1), "My task", "Training", TaskStatus.NOT_STARTED);

        mockMvc.perform(dashboard())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentEntries.length()").value(1))
                .andExpect(jsonPath("$.recentEntries[0].title").value("My task"));
    }

    /**
     * 14 entries: 5 tasks (2 completed), 4 issues (1 open, 1 in progress, 1 resolved, 1 closed),
     * 2 feedback notes and 3 additional notes, on distinct descending dates.
     */
    private void seedDataset() {
        testEntries.note(recruit, LocalDate.of(2026, 3, 14), "Note 14", "onboarding");
        testEntries.feedback(recruit, LocalDate.of(2026, 3, 13), "Feedback 13", FeedbackType.POSITIVE);
        testEntries.issue(recruit, LocalDate.of(2026, 3, 12), "Issue in progress", IssueStatus.IN_PROGRESS,
                IssueSeverity.HIGH);
        testEntries.task(recruit, LocalDate.of(2026, 3, 11), "Task 11", "Training", TaskStatus.COMPLETED);
        testEntries.note(recruit, LocalDate.of(2026, 3, 10), "Note 10", "onboarding");
        testEntries.feedback(recruit, LocalDate.of(2026, 3, 9), "Feedback 9", FeedbackType.CONCERN);
        testEntries.issue(recruit, LocalDate.of(2026, 3, 8), "Issue open", IssueStatus.OPEN, IssueSeverity.MEDIUM);
        testEntries.task(recruit, LocalDate.of(2026, 3, 7), "Task 7", "Training", TaskStatus.COMPLETED);
        testEntries.note(recruit, LocalDate.of(2026, 3, 6), "Note 6", "office");
        testEntries.issue(recruit, LocalDate.of(2026, 3, 5), "Issue resolved", IssueStatus.RESOLVED,
                IssueSeverity.LOW);
        testEntries.task(recruit, LocalDate.of(2026, 3, 4), "Task 4", "Training", TaskStatus.IN_PROGRESS);
        testEntries.issue(recruit, LocalDate.of(2026, 3, 3), "Issue closed", IssueStatus.CLOSED, IssueSeverity.LOW);
        testEntries.task(recruit, LocalDate.of(2026, 3, 2), "Task 2", "Training", TaskStatus.NOT_STARTED);
        testEntries.task(recruit, LocalDate.of(2026, 3, 1), "Task 1", "Training", TaskStatus.BLOCKED);
    }

    /** The entities stamp {@code created_at} themselves, so ties are forced through SQL. */
    private void setCreatedAt(String table, long id, Instant createdAt) {
        entityManager.flush();
        jdbcTemplate.update("update " + table + " set created_at = ? where id = ?",
                Timestamp.from(createdAt), id);
        entityManager.clear();
    }

    private RequestBuilder dashboard() {
        return get("/api/dashboard").header("Authorization", "Bearer " + token);
    }
}
