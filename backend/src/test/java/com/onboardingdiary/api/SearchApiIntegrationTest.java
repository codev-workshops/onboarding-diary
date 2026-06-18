package com.onboardingdiary.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardingdiary.AbstractIntegrationTest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SearchApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private IssueRepository issueRepository;
    @Autowired
    private FeedbackRepository feedbackRepository;
    @Autowired
    private NoteRepository noteRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private static final String PASSWORD = "password12345";

    @BeforeEach
    void cleanDb() {
        taskRepository.deleteAll();
        issueRepository.deleteAll();
        feedbackRepository.deleteAll();
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

    private void create(String path, String token, String json) throws Exception {
        mockMvc.perform(post("/api/v1/" + path)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated());
    }

    /** Seeds one of each entity type, all containing the keyword "onboarding". */
    private void seedKeyworded(String token, String marker) throws Exception {
        create("tasks", token, """
                {"date":"2026-02-01","title":"Onboarding task %s","description":"plan","category":"LEARNING","status":"TODO","priority":"LOW"}
                """.formatted(marker));
        create("issues", token, """
                {"date":"2026-02-02","title":"Issue %s","description":"onboarding blocker","severity":"HIGH","status":"OPEN"}
                """.formatted(marker));
        create("feedback", token, """
                {"date":"2026-02-03","subject":"Onboarding feedback %s","type":"POSITIVE","details":"great"}
                """.formatted(marker));
        create("notes", token, """
                {"date":"2026-02-04","title":"Note %s","content":"my onboarding recap","tags":["week1"]}
                """.formatted(marker));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/search").param("q", "onboarding"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void blankQueryIsRejected() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        mockMvc.perform(get("/api/v1/search").param("q", "   ")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recruitSearchesAcrossAllTypesOwnDataOnly() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        persistUser("other@acme.com", Role.RECRUIT, null);
        seedKeyworded(tokenFor("rec@acme.com"), "MINE");
        seedKeyworded(tokenFor("other@acme.com"), "THEIRS");

        mockMvc.perform(get("/api/v1/search").param("q", "onboarding")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(4)))
                .andExpect(jsonPath("$.results.length()", is(4)))
                .andExpect(jsonPath("$.results[*].ownerId", everyItem(is((int) ownerId("rec@acme.com")))));
    }

    @Test
    void typeFilterRestrictsToRequestedEntities() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        seedKeyworded(tokenFor("rec@acme.com"), "X");

        mockMvc.perform(get("/api/v1/search")
                        .param("q", "onboarding")
                        .param("types", "TASK", "NOTE")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(2)))
                .andExpect(jsonPath("$.results[*].type", everyItem(org.hamcrest.Matchers.anyOf(is("TASK"), is("NOTE")))));
    }

    @Test
    void managerSeesAssignedRecruitMatchesOnly() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("unassigned@acme.com", Role.RECRUIT, null);

        seedKeyworded(tokenFor("assigned@acme.com"), "ASSIGNED");
        seedKeyworded(tokenFor("unassigned@acme.com"), "HIDDEN");

        mockMvc.perform(get("/api/v1/search").param("q", "onboarding")
                        .header("Authorization", "Bearer " + tokenFor("mgr@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(4)))
                .andExpect(jsonPath("$.results[*].ownerId",
                        everyItem(is((int) ownerId("assigned@acme.com")))));
    }

    @Test
    void adminSeesMatchesAcrossAllUsers() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);
        seedKeyworded(tokenFor("r1@acme.com"), "ONE");
        seedKeyworded(tokenFor("r2@acme.com"), "TWO");

        mockMvc.perform(get("/api/v1/search").param("q", "onboarding")
                        .header("Authorization", "Bearer " + tokenFor("admin@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(8)));
    }

    @Test
    void titleMatchRanksAboveBodyOnlyMatch() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");
        create("tasks", token, """
                {"date":"2026-02-01","title":"Sprint planning","description":"discuss kanban board","category":"MEETING","status":"TODO","priority":"LOW"}
                """);
        create("tasks", token, """
                {"date":"2026-02-02","title":"Kanban setup","description":"nothing relevant","category":"SETUP","status":"TODO","priority":"LOW"}
                """);

        mockMvc.perform(get("/api/v1/search").param("q", "kanban").param("sort", "RELEVANCE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(2)))
                .andExpect(jsonPath("$.results[0].title", is("Kanban setup")));
    }

    private long ownerId(String email) {
        return userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
    }

    record LoginPayload(String email, String password) {
    }
}
