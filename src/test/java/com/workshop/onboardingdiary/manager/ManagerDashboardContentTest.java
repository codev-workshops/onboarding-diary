package com.workshop.onboardingdiary.manager;

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
import java.time.LocalDate;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * The aggregate content of the manager dashboard (REQUIREMENTS 10.2): team-wide counts across all
 * four entry types, the open CRITICAL/HIGH issue attention list and the seven-day inactivity list,
 * all scoped to the recruits one manager oversees.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ManagerDashboardContentTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    private User manager;
    private User activeRecruit;
    private User staleRecruit;
    private User silentRecruit;
    private String managerToken;

    private final LocalDate today = LocalDate.now();
    private final LocalDate longAgo = today.minusDays(30);

    @BeforeEach
    void setUp() {
        manager = testUsers.create("md-content-manager@example.com", "sup3rsecret", Role.MANAGER, true);
        activeRecruit = testUsers.create("md-content-active@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        staleRecruit = testUsers.create("md-content-stale@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        silentRecruit = testUsers.create("md-content-silent@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        testEntries.assign(manager, activeRecruit);
        testEntries.assign(manager, staleRecruit);
        testEntries.assign(manager, silentRecruit);

        // A recruit outside this manager's scope: its entries must never be counted.
        User otherManager = testUsers.create("md-content-other-manager@example.com", "sup3rsecret", Role.MANAGER, true);
        User outsideRecruit = testUsers.create("md-content-outside@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        testEntries.assign(otherManager, outsideRecruit);
        testEntries.task(outsideRecruit, today, "Outside task", "Training", TaskStatus.NOT_STARTED);
        testEntries.issue(outsideRecruit, today, "Outside issue", IssueStatus.OPEN, IssueSeverity.CRITICAL);

        // Active recruit: recent entries (so it is not inactive) and two open high-priority issues.
        testEntries.task(activeRecruit, today, "Active task", "Training", TaskStatus.COMPLETED);
        testEntries.issue(activeRecruit, today, "Critical open", IssueStatus.OPEN, IssueSeverity.CRITICAL);
        testEntries.issue(activeRecruit, today, "High in progress", IssueStatus.IN_PROGRESS, IssueSeverity.HIGH);

        // Stale recruit: entries only 30 days ago (inactive) and issues that must NOT be high-priority.
        testEntries.task(staleRecruit, longAgo, "Stale task", "Training", TaskStatus.NOT_STARTED);
        testEntries.feedback(staleRecruit, longAgo, "Stale feedback", FeedbackType.POSITIVE);
        testEntries.issue(staleRecruit, longAgo, "High but resolved", IssueStatus.RESOLVED, IssueSeverity.HIGH);
        testEntries.issue(staleRecruit, longAgo, "Low but open", IssueStatus.OPEN, IssueSeverity.LOW);

        // Silent recruit: no entries at all (inactive with a null last entry date).

        managerToken = jwtService.issueToken(manager.getEmail(), manager.getRole());
    }

    @Test
    void countsAggregateAcrossAllFourEntryTypesForTheWholeTeamOnly() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.managerId").value(manager.getId()))
                .andExpect(jsonPath("$.teamSize").value(3))
                .andExpect(jsonPath("$.counts.tasks").value(2))
                .andExpect(jsonPath("$.counts.issues").value(4))
                .andExpect(jsonPath("$.counts.feedbackNotes").value(1))
                .andExpect(jsonPath("$.counts.additionalNotes").value(0));
    }

    @Test
    void onlyOpenCriticalOrHighIssuesFeedTheAttentionList() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recruitsWithOpenHighPriorityIssues.length()").value(1))
                .andExpect(jsonPath("$.recruitsWithOpenHighPriorityIssues[0].userId").value(activeRecruit.getId()))
                .andExpect(jsonPath("$.recruitsWithOpenHighPriorityIssues[0].openCriticalOrHigh").value(2));
    }

    @Test
    void inactiveRecruitsCoverStaleAndNeverActiveRecruitsAcrossAllTypes() throws Exception {
        // All recruits share the same seeded name, so the list is ordered by user id: stale, then silent.
        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inactiveRecruits.length()").value(2))
                .andExpect(jsonPath("$.inactiveRecruits[0].userId").value(staleRecruit.getId()))
                .andExpect(jsonPath("$.inactiveRecruits[0].lastEntryDate").value(longAgo.toString()))
                .andExpect(jsonPath("$.inactiveRecruits[1].userId").value(silentRecruit.getId()))
                .andExpect(jsonPath("$.inactiveRecruits[1].lastEntryDate").value(Matchers.nullValue()));
    }

    @Test
    void aManagerWithNoRecruitsGetsAZeroEmptyStateNotAnError() throws Exception {
        User lonelyManager = testUsers.create("md-content-lonely@example.com", "sup3rsecret", Role.MANAGER, true);
        String token = jwtService.issueToken(lonelyManager.getEmail(), lonelyManager.getRole());

        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.managerId").value(lonelyManager.getId()))
                .andExpect(jsonPath("$.teamSize").value(0))
                .andExpect(jsonPath("$.counts.tasks").value(0))
                .andExpect(jsonPath("$.counts.issues").value(0))
                .andExpect(jsonPath("$.counts.feedbackNotes").value(0))
                .andExpect(jsonPath("$.counts.additionalNotes").value(0))
                .andExpect(jsonPath("$.recruitsWithOpenHighPriorityIssues.length()").value(0))
                .andExpect(jsonPath("$.inactiveRecruits.length()").value(0));
    }

    @Test
    void aRecruitBecomesActiveAssoonAsAnyEntryTypeIsRecent() throws Exception {
        // A single recent note is enough to drop the stale recruit off the inactivity list.
        testEntries.note(staleRecruit, today, "Fresh note", "onboarding");

        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inactiveRecruits.length()").value(1))
                .andExpect(jsonPath("$.inactiveRecruits[0].userId").value(silentRecruit.getId()));
    }
}
