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
import org.springframework.transaction.annotation.Transactional;

/**
 * Search authentication and the ownership/oversight rules reused from Sections 6.2 and 9.1: an
 * out-of-scope or unknown {@code userId} is a 403, never a 404, and another user's matching entry is
 * never returned.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SearchAuthorizationTest {

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
        owner = testUsers.create("search-authz-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        User otherRecruit = testUsers.create("search-authz-recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT,
                true);
        User overseeingManager = testUsers.create("search-authz-manager@example.com", "sup3rsecret", Role.MANAGER,
                true);
        User otherManager = testUsers.create("search-authz-other-manager@example.com", "sup3rsecret", Role.MANAGER,
                true);
        User admin = testUsers.create("search-authz-admin@example.com", "sup3rsecret", Role.ADMIN, true);
        testEntries.assign(overseeingManager, owner);

        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 1), "Onboarding handbook", null);

        ownerToken = token(owner);
        otherRecruitToken = token(otherRecruit);
        overseeingManagerToken = token(overseeingManager);
        otherManagerToken = token(otherManager);
        adminToken = token(admin);
    }

    private String token(User user) {
        return jwtService.issueToken(user.getEmail(), user.getRole());
    }

    @Test
    void anUnauthenticatedRequestIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding")).andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/search").param("q", "onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anotherUsersMatchingEntryIsNeverReturned() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherRecruitToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.results.tasks.items", Matchers.hasSize(0)));
    }

    @Test
    void aRecruitMayNotSearchAnotherUsersEntries() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding").param("userId", String.valueOf(owner.getId()))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anOverseeingManagerMaySearchTheirRecruit() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding").param("userId", String.valueOf(owner.getId()))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.results.tasks.items[0].title").value("Onboarding handbook"));
    }

    @Test
    void anUnassignedManagerIsForbidden() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding").param("userId", String.valueOf(owner.getId()))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anUnknownUserIdIsForbiddenRatherThanNotFound() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding").param("userId", "999999")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + overseeingManagerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/search").param("q", "onboarding").param("userId", "999999")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminMaySearchAnyUser() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding").param("userId", String.valueOf(owner.getId()))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.results.tasks.count").value(1));
    }

    @Test
    void searchWithoutATargetCoversTheCallersOwnEntries() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "onboarding")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(owner.getId()))
                .andExpect(jsonPath("$.results.tasks.count").value(1));
    }
}
