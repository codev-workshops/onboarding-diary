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

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class DashboardApiIntegrationTest extends AbstractIntegrationTest {

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

    private void seedFullSet(String token) throws Exception {
        create("tasks", token, """
                {"date":"2026-02-01","title":"Read docs","category":"LEARNING","status":"DONE","priority":"LOW"}
                """);
        create("tasks", token, """
                {"date":"2026-02-02","title":"Setup env","category":"SETUP","status":"TODO","priority":"HIGH"}
                """);
        create("issues", token, """
                {"date":"2026-02-03","title":"VPN broken","severity":"HIGH","status":"OPEN"}
                """);
        create("feedback", token, """
                {"date":"2026-02-04","subject":"Great buddy","type":"POSITIVE"}
                """);
        create("notes", token, """
                {"date":"2026-02-05","title":"Day 1 recap","tags":["week1"]}
                """);
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard")).andExpect(status().isUnauthorized());
    }

    @Test
    void recruitSeesOnlyOwnAggregates() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        persistUser("other@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");
        String otherToken = tokenFor("other@acme.com");

        seedFullSet(token);
        // Noise owned by another recruit must not be counted.
        create("tasks", otherToken, """
                {"date":"2026-02-09","title":"Other task","category":"OTHER","status":"DONE","priority":"LOW"}
                """);

        mockMvc.perform(get("/api/v1/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.tasks", is(2)))
                .andExpect(jsonPath("$.summary.issues", is(1)))
                .andExpect(jsonPath("$.summary.feedback", is(1)))
                .andExpect(jsonPath("$.summary.notes", is(1)))
                .andExpect(jsonPath("$.taskMetrics.total", is(2)))
                .andExpect(jsonPath("$.taskMetrics.completed", is(1)))
                .andExpect(jsonPath("$.taskMetrics.completionRate", closeTo(0.5, 1e-9)))
                .andExpect(jsonPath("$.taskMetrics.byStatus.DONE", is(1)))
                .andExpect(jsonPath("$.taskMetrics.byStatus.TODO", is(1)))
                .andExpect(jsonPath("$.issueMetrics.open", is(1)))
                .andExpect(jsonPath("$.issueMetrics.bySeverity.HIGH", is(1)))
                .andExpect(jsonPath("$.recentActivity.length()", is(5)));
    }

    @Test
    void managerSeesAssignedRecruitAggregatesOnly() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("unassigned@acme.com", Role.RECRUIT, null);

        seedFullSet(tokenFor("assigned@acme.com"));
        create("tasks", tokenFor("unassigned@acme.com"), """
                {"date":"2026-02-09","title":"Hidden","category":"OTHER","status":"TODO","priority":"LOW"}
                """);

        mockMvc.perform(get("/api/v1/dashboard").header("Authorization", "Bearer " + tokenFor("mgr@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.tasks", is(2)))
                .andExpect(jsonPath("$.summary.notes", is(1)));
    }

    @Test
    void adminSeesAllAggregates() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);

        seedFullSet(tokenFor("r1@acme.com"));
        seedFullSet(tokenFor("r2@acme.com"));

        mockMvc.perform(get("/api/v1/dashboard").header("Authorization", "Bearer " + tokenFor("admin@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.tasks", is(4)))
                .andExpect(jsonPath("$.summary.issues", is(2)))
                .andExpect(jsonPath("$.summary.feedback", is(2)))
                .andExpect(jsonPath("$.summary.notes", is(2)))
                .andExpect(jsonPath("$.taskMetrics.completed", is(2)))
                .andExpect(jsonPath("$.recentActivity.length()", is(10)));
    }

    record LoginPayload(String email, String password) {
    }
}
