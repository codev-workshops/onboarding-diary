package com.onboardingdiary.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardingdiary.AbstractIntegrationTest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.FeedbackRepository;
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
class FeedbackApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private FeedbackRepository feedbackRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private static final String PASSWORD = "password12345";

    @BeforeEach
    void cleanDb() {
        feedbackRepository.deleteAll();
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

    private long createFeedback(String token, String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/feedback")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/feedback")).andExpect(status().isUnauthorized());
    }

    @Test
    void recruitCanCreateGetUpdateDeleteOwnFeedback() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");

        long id = createFeedback(token, """
                {"date":"2026-02-01","subject":"Buddy was great","type":"POSITIVE","details":"helped a lot"}
                """);

        mockMvc.perform(get("/api/v1/feedback/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject", is("Buddy was great")))
                .andExpect(jsonPath("$.type", is("POSITIVE")));

        mockMvc.perform(put("/api/v1/feedback/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"2026-02-02","subject":"Need clearer docs","type":"SUGGESTION","details":"wiki is stale"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject", is("Need clearer docs")))
                .andExpect(jsonPath("$.type", is("SUGGESTION")));

        mockMvc.perform(delete("/api/v1/feedback/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/feedback/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRejectsInvalidPayload() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");
        mockMvc.perform(post("/api/v1/feedback")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"subject":"","type":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void recruitCannotReadOrModifyOthersFeedback() throws Exception {
        User owner = persistUser("owner@acme.com", Role.RECRUIT, null);
        persistUser("intruder@acme.com", Role.RECRUIT, null);
        String ownerToken = tokenFor("owner@acme.com");
        String intruderToken = tokenFor("intruder@acme.com");

        long id = createFeedback(ownerToken, """
                {"date":"2026-02-01","subject":"Private","type":"CONCERN"}
                """);

        mockMvc.perform(get("/api/v1/feedback/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/feedback/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(feedbackRepository.findById(id)).isPresent();
        org.assertj.core.api.Assertions.assertThat(owner.getId()).isNotNull();
    }

    @Test
    void managerSeesAssignedRecruitFeedbackButNotUnassigned() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("unassigned@acme.com", Role.RECRUIT, null);

        String assignedToken = tokenFor("assigned@acme.com");
        String unassignedToken = tokenFor("unassigned@acme.com");
        String managerToken = tokenFor("mgr@acme.com");

        createFeedback(assignedToken, """
                {"date":"2026-02-01","subject":"Assigned feedback","type":"POSITIVE"}
                """);
        createFeedback(unassignedToken, """
                {"date":"2026-02-01","subject":"Unassigned feedback","type":"POSITIVE"}
                """);

        mockMvc.perform(get("/api/v1/feedback").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].subject", is("Assigned feedback")));
    }

    @Test
    void managerCannotFilterByUnassignedOwner() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        User unassigned = persistUser("unassigned@acme.com", Role.RECRUIT, null);
        String managerToken = tokenFor("mgr@acme.com");

        mockMvc.perform(get("/api/v1/feedback")
                        .param("ownerId", String.valueOf(unassigned.getId()))
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminSeesAllFeedbackAndCanFilter() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        User r1 = persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);
        String adminToken = tokenFor("admin@acme.com");
        String t1 = tokenFor("r1@acme.com");
        String t2 = tokenFor("r2@acme.com");

        createFeedback(t1, """
                {"date":"2026-02-01","subject":"R1 concern","type":"CONCERN"}
                """);
        createFeedback(t2, """
                {"date":"2026-03-01","subject":"R2 positive","type":"POSITIVE"}
                """);

        mockMvc.perform(get("/api/v1/feedback").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(2)));

        mockMvc.perform(get("/api/v1/feedback")
                        .param("type", "CONCERN")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].subject", is("R1 concern")));

        mockMvc.perform(get("/api/v1/feedback")
                        .param("ownerId", String.valueOf(r1.getId()))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));

        mockMvc.perform(get("/api/v1/feedback")
                        .param("search", "r1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));

        mockMvc.perform(get("/api/v1/feedback")
                        .param("dateFrom", "2026-02-15")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].subject", is("R2 positive")));
    }

    record LoginPayload(String email, String password) {
    }
}
