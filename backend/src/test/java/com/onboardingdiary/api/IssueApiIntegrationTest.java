package com.onboardingdiary.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardingdiary.AbstractIntegrationTest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class IssueApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private IssueRepository issueRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private static final String PASSWORD = "password12345";

    @BeforeEach
    void cleanDb() {
        issueRepository.deleteAll();
        userRepository.deleteAll();
    }

    private User persistUser(String email, Role role, Long managerId) {
        User user = new User();
        user.setName("User " + email);
        user.setEmail(email);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setManagerId(managerId);
        return userRepository.save(user);
    }

    private String tokenFor(String email) throws Exception {
        String body = objectMapper.writeValueAsString(new LoginPayload(email, PASSWORD));
        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private long createIssue(String token, String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/issues")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/issues")).andExpect(status().isUnauthorized());
    }

    @Test
    void recruitCanCreateGetUpdateDeleteOwnIssue() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");

        long id = createIssue(token, """
                {"date":"2026-02-01","title":"VPN drops","description":"disconnects hourly",
                 "severity":"HIGH","status":"OPEN"}
                """);

        mockMvc.perform(get("/api/v1/issues/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("VPN drops")))
                .andExpect(jsonPath("$.severity", is("HIGH")))
                .andExpect(jsonPath("$.status", is("OPEN")));

        mockMvc.perform(put("/api/v1/issues/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"2026-02-02","title":"VPN drops","description":"disconnects hourly",
                                 "severity":"LOW","status":"RESOLVED","resolutionNotes":"Reinstalled client"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESOLVED")))
                .andExpect(jsonPath("$.severity", is("LOW")))
                .andExpect(jsonPath("$.resolutionNotes", is("Reinstalled client")));

        mockMvc.perform(delete("/api/v1/issues/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/issues/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRejectsInvalidPayload() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");
        mockMvc.perform(post("/api/v1/issues")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"","severity":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void recruitCannotReadOrModifyOthersIssue() throws Exception {
        User owner = persistUser("owner@acme.com", Role.RECRUIT, null);
        persistUser("intruder@acme.com", Role.RECRUIT, null);
        String ownerToken = tokenFor("owner@acme.com");
        String intruderToken = tokenFor("intruder@acme.com");

        long id = createIssue(ownerToken, """
                {"date":"2026-02-01","title":"Private","severity":"MEDIUM"}
                """);

        mockMvc.perform(get("/api/v1/issues/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/issues/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(issueRepository.findById(id)).isPresent();
        org.assertj.core.api.Assertions.assertThat(owner.getId()).isNotNull();
    }

    @Test
    void managerSeesAssignedRecruitIssuesButNotUnassigned() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("unassigned@acme.com", Role.RECRUIT, null);

        String assignedToken = tokenFor("assigned@acme.com");
        String unassignedToken = tokenFor("unassigned@acme.com");
        String managerToken = tokenFor("mgr@acme.com");

        createIssue(assignedToken, """
                {"date":"2026-02-01","title":"Assigned issue","severity":"HIGH"}
                """);
        createIssue(unassignedToken, """
                {"date":"2026-02-01","title":"Unassigned issue","severity":"HIGH"}
                """);

        mockMvc.perform(get("/api/v1/issues").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("Assigned issue")));
    }

    @Test
    void managerCannotFilterByUnassignedOwner() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        User unassigned = persistUser("unassigned@acme.com", Role.RECRUIT, null);
        String managerToken = tokenFor("mgr@acme.com");

        mockMvc.perform(get("/api/v1/issues")
                        .param("ownerId", String.valueOf(unassigned.getId()))
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminSeesAllIssuesAndCanFilter() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        User r1 = persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);
        String adminToken = tokenFor("admin@acme.com");
        String t1 = tokenFor("r1@acme.com");
        String t2 = tokenFor("r2@acme.com");

        createIssue(t1, """
                {"date":"2026-02-01","title":"R1 critical","severity":"CRITICAL","status":"OPEN"}
                """);
        createIssue(t2, """
                {"date":"2026-03-01","title":"R2 low","severity":"LOW","status":"CLOSED"}
                """);

        mockMvc.perform(get("/api/v1/issues").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(2)));

        mockMvc.perform(get("/api/v1/issues")
                        .param("severity", "CRITICAL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("R1 critical")));

        mockMvc.perform(get("/api/v1/issues")
                        .param("ownerId", String.valueOf(r1.getId()))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));

        mockMvc.perform(get("/api/v1/issues")
                        .param("status", "CLOSED")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("R2 low")));

        mockMvc.perform(get("/api/v1/issues")
                        .param("search", "r1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));

        mockMvc.perform(get("/api/v1/issues")
                        .param("dateFrom", "2026-02-15")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("R2 low")));
    }

    record LoginPayload(String email, String password) {
    }
}
