package com.workshop.onboardingdiary.reports;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * Report authentication and the ownership/oversight rules reused from the entry lists and the
 * dashboard (REQUIREMENTS 4.7, 6.2, US-R11, US-M04).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReportAuthorizationTest {

    private static final String RANGE = "dateFrom=2026-02-01&dateTo=2026-02-28";

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
        owner = testUsers.create("report-authz-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        User otherRecruit = testUsers.create("report-authz-recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT,
                true);
        User overseeingManager = testUsers.create("report-authz-manager@example.com", "sup3rsecret", Role.MANAGER,
                true);
        User otherManager = testUsers.create("report-authz-other-manager@example.com", "sup3rsecret", Role.MANAGER,
                true);
        User admin = testUsers.create("report-authz-admin@example.com", "sup3rsecret", Role.ADMIN, true);
        testEntries.assign(overseeingManager, owner);
        testEntries.task(owner, LocalDate.of(2026, 2, 10), "Owned task", "Training", TaskStatus.COMPLETED);

        ownerToken = token(owner);
        otherRecruitToken = token(otherRecruit);
        overseeingManagerToken = token(overseeingManager);
        otherManagerToken = token(otherManager);
        adminToken = token(admin);
    }

    @Test
    void anUnauthenticatedRequestIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/reports?" + RANGE + "&format=csv")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/reports/preview?" + RANGE)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/reports?" + RANGE + "&format=csv").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theOwnerReportsOnThemselvesWithoutPassingAUserId() throws Exception {
        mockMvc.perform(get("/api/reports/preview?" + RANGE).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.tasks.length()").value(1));
        mockMvc.perform(get("/api/reports?" + RANGE + "&format=pdf").header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());
    }

    @Test
    void aRecruitCannotReportOnAnotherRecruit() throws Exception {
        mockMvc.perform(get("/api/reports?" + RANGE + "&format=csv&userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/reports/preview?" + RANGE + "&userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anOverseeingManagerMayReportOnTheRecruit() throws Exception {
        mockMvc.perform(get("/api/reports?" + RANGE + "&format=csv&userId=" + owner.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/reports/preview?" + RANGE + "&userId=" + owner.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()));
    }

    @Test
    void aManagerWithoutAnAssignmentIsForbidden() throws Exception {
        mockMvc.perform(get("/api/reports?" + RANGE + "&format=csv&userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminMayReportOnAnyUserId() throws Exception {
        mockMvc.perform(get("/api/reports/preview?" + RANGE + "&userId=" + owner.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.tasks.length()").value(1));
    }

    @Test
    void anUnknownUserIdIsIndistinguishableFromAForbiddenOne() throws Exception {
        mockMvc.perform(get("/api/reports?" + RANGE + "&format=csv&userId=999999")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isForbidden());
    }

    private String token(User user) {
        return jwtService.issueToken(user.getEmail(), user.getRole());
    }
}
