package com.onboardingdiary.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardingdiary.AbstractIntegrationTest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class NoteApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private NoteRepository noteRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private static final String PASSWORD = "password12345";

    @BeforeEach
    void cleanDb() {
        noteRepository.deleteAll();
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

    private long createNote(String token, String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/notes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/notes")).andExpect(status().isUnauthorized());
    }

    @Test
    void recruitCanCreateGetUpdateDeleteOwnNote() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");

        long id = createNote(token, """
                {"date":"2026-02-01","title":"Setup laptop","content":"installed tools","tags":["Setup","docs"]}
                """);

        mockMvc.perform(get("/api/v1/notes/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Setup laptop")))
                .andExpect(jsonPath("$.tags", containsInAnyOrder("setup", "docs")));

        mockMvc.perform(put("/api/v1/notes/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"2026-02-02","title":"Week 1 retro","content":"learnings","tags":["retro"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Week 1 retro")))
                .andExpect(jsonPath("$.tags", containsInAnyOrder("retro")));

        mockMvc.perform(delete("/api/v1/notes/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/notes/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRejectsInvalidPayload() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");
        mockMvc.perform(post("/api/v1/notes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void recruitCannotReadOrModifyOthersNote() throws Exception {
        persistUser("owner@acme.com", Role.RECRUIT, null);
        persistUser("intruder@acme.com", Role.RECRUIT, null);
        String ownerToken = tokenFor("owner@acme.com");
        String intruderToken = tokenFor("intruder@acme.com");

        long id = createNote(ownerToken, """
                {"date":"2026-02-01","title":"Private","content":"secret","tags":["x"]}
                """);

        mockMvc.perform(get("/api/v1/notes/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/notes/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        org.assertj.core.api.Assertions.assertThat(noteRepository.findById(id)).isPresent();
    }

    @Test
    void managerSeesAssignedRecruitNotesButNotUnassigned() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("unassigned@acme.com", Role.RECRUIT, null);

        String assignedToken = tokenFor("assigned@acme.com");
        String unassignedToken = tokenFor("unassigned@acme.com");
        String managerToken = tokenFor("mgr@acme.com");

        createNote(assignedToken, """
                {"date":"2026-02-01","title":"Assigned note","tags":["a"]}
                """);
        createNote(unassignedToken, """
                {"date":"2026-02-01","title":"Unassigned note","tags":["b"]}
                """);

        mockMvc.perform(get("/api/v1/notes").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("Assigned note")));
    }

    @Test
    void managerCannotFilterByUnassignedOwner() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        User unassigned = persistUser("unassigned@acme.com", Role.RECRUIT, null);
        String managerToken = tokenFor("mgr@acme.com");

        mockMvc.perform(get("/api/v1/notes")
                        .param("ownerId", String.valueOf(unassigned.getId()))
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminSeesAllNotesAndCanFilterByTagDateAndSearch() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        User r1 = persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);
        String adminToken = tokenFor("admin@acme.com");
        String t1 = tokenFor("r1@acme.com");
        String t2 = tokenFor("r2@acme.com");

        createNote(t1, """
                {"date":"2026-02-01","title":"Onboarding setup","content":"vpn","tags":["setup","week1"]}
                """);
        createNote(t2, """
                {"date":"2026-03-01","title":"Team intro","content":"met the team","tags":["people"]}
                """);

        mockMvc.perform(get("/api/v1/notes").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(2)));

        mockMvc.perform(get("/api/v1/notes")
                        .param("tags", "setup")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("Onboarding setup")));

        mockMvc.perform(get("/api/v1/notes")
                        .param("tags", "setup")
                        .param("tags", "missing")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(0)));

        mockMvc.perform(get("/api/v1/notes")
                        .param("ownerId", String.valueOf(r1.getId()))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));

        mockMvc.perform(get("/api/v1/notes")
                        .param("search", "team")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("Team intro")));

        mockMvc.perform(get("/api/v1/notes")
                        .param("dateFrom", "2026-02-15")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title", is("Team intro")));
    }

    record LoginPayload(String email, String password) {
    }
}
