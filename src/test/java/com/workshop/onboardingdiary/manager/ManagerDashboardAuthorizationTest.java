package com.workshop.onboardingdiary.manager;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manager-dashboard authentication and the Manager/Admin scoping rules of REQUIREMENTS 10.4: a
 * Manager only ever sees their own team, only an Admin may target another manager, and an unknown or
 * non-manager id is a 403 rather than a 404, mirroring {@code EntryAccessService.resolveListTarget}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ManagerDashboardAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    private User manager;
    private User recruit;
    private String recruitToken;
    private String managerToken;
    private String otherManagerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        recruit = testUsers.create("md-authz-recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        manager = testUsers.create("md-authz-manager@example.com", "sup3rsecret", Role.MANAGER, true);
        User otherManager = testUsers.create("md-authz-other-manager@example.com", "sup3rsecret", Role.MANAGER, true);
        User admin = testUsers.create("md-authz-admin@example.com", "sup3rsecret", Role.ADMIN, true);
        testEntries.assign(manager, recruit);

        recruitToken = token(recruit);
        managerToken = token(manager);
        otherManagerToken = token(otherManager);
        adminToken = token(admin);
    }

    @Test
    void anUnauthenticatedRequestIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aNewRecruitIsForbidden() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + recruitToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void aManagerSeesTheirOwnTeamWithoutPassingAManagerId() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.managerId").value(manager.getId()))
                .andExpect(jsonPath("$.teamSize").value(1));
    }

    @Test
    void aManagerMayPassTheirOwnId() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard?managerId=" + manager.getId())
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.managerId").value(manager.getId()));
    }

    @Test
    void aManagerCannotTargetAnotherManager() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard?managerId=" + manager.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminMayTargetAnyManager() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard?managerId=" + manager.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.managerId").value(manager.getId()))
                .andExpect(jsonPath("$.teamSize").value(1));
    }

    @Test
    void anAdminWithoutAManagerIdSeesTheirOwnEmptyScope() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamSize").value(0))
                .andExpect(jsonPath("$.recruitsWithOpenHighPriorityIssues.length()").value(0))
                .andExpect(jsonPath("$.inactiveRecruits.length()").value(0));
    }

    @Test
    void anUnknownManagerIdIsForbiddenNotFound() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard?managerId=999999")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void aNonManagerTargetIdIsForbidden() throws Exception {
        mockMvc.perform(get("/api/manager-dashboard?managerId=" + recruit.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    private String token(User user) {
        return jwtService.issueToken(user.getEmail(), user.getRole());
    }
}
