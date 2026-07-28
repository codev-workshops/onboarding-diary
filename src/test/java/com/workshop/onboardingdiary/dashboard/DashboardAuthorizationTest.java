package com.workshop.onboardingdiary.dashboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dashboard authentication and the ownership/oversight rules reused from Phase 3 and 4
 * (REQUIREMENTS 4.6, 6.2, US-R10, US-M03). Oversight rows are seeded directly because the admin
 * assignment endpoints (section 4.8) belong to a later phase.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DashboardAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    private User owner;
    private String ownerToken;
    private String otherRecruitToken;
    private String overseeingManagerToken;
    private String otherManagerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        owner = testUsers.create("dashboard-authz-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        User otherRecruit = testUsers.create("dashboard-authz-recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT,
                true);
        User overseeingManager = testUsers.create("dashboard-authz-manager@example.com", "sup3rsecret", Role.MANAGER,
                true);
        User otherManager = testUsers.create("dashboard-authz-other-manager@example.com", "sup3rsecret", Role.MANAGER,
                true);
        User admin = testUsers.create("dashboard-authz-admin@example.com", "sup3rsecret", Role.ADMIN, true);
        testEntries.assign(overseeingManager, owner);

        testEntries.task(owner, LocalDate.of(2026, 2, 1), "Owned task", "Training", TaskStatus.COMPLETED);
        testEntries.issue(owner, LocalDate.of(2026, 2, 2), "Owned issue", IssueStatus.OPEN, IssueSeverity.HIGH);

        ownerToken = token(owner);
        otherRecruitToken = token(otherRecruit);
        overseeingManagerToken = token(overseeingManager);
        otherManagerToken = token(otherManager);
        adminToken = token(admin);
    }

    @Test
    void anUnauthenticatedRequestIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/dashboard?userId=" + owner.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/dashboard").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theOwnerSeesTheirOwnDashboardWithoutPassingAUserId() throws Exception {
        mockMvc.perform(get("/api/dashboard").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.counts.tasks").value(1))
                .andExpect(jsonPath("$.openIssues.length()").value(1));
    }

    @Test
    void aRecruitCannotSeeAnotherRecruitsDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anOverseeingManagerSeesTheRecruitsDashboard() throws Exception {
        mockMvc.perform(get("/api/dashboard?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.recentEntries.length()").value(2));
    }

    @Test
    void aManagerWithoutAnAssignmentIsForbidden() throws Exception {
        mockMvc.perform(get("/api/dashboard?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminMayPassAnyUserId() throws Exception {
        mockMvc.perform(get("/api/dashboard?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.counts.tasks").value(1));
    }

    @Test
    void anUnknownUserIdIsIndistinguishableFromAForbiddenOne() throws Exception {
        mockMvc.perform(get("/api/dashboard?userId=999999").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isForbidden());
    }

    private String token(User user) {
        return jwtService.issueToken(user.getEmail(), user.getRole());
    }
}
