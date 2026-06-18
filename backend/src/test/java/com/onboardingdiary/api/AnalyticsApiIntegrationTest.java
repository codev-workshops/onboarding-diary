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

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AnalyticsApiIntegrationTest extends AbstractIntegrationTest {

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

    private void seedTasks(String token) throws Exception {
        create("tasks", token, """
                {"date":"2026-02-01","title":"a","category":"LEARNING","status":"DONE","priority":"LOW"}
                """);
        create("tasks", token, """
                {"date":"2026-02-01","title":"b","category":"LEARNING","status":"TODO","priority":"LOW"}
                """);
        create("issues", token, """
                {"date":"2026-02-02","title":"i","severity":"HIGH","status":"OPEN"}
                """);
        create("feedback", token, """
                {"date":"2026-02-03","subject":"f","type":"POSITIVE"}
                """);
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/analytics"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invertedDateRangeIsRejected() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        mockMvc.perform(get("/api/v1/analytics")
                        .param("dateFrom", "2026-03-01")
                        .param("dateTo", "2026-02-01")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recruitSeesOwnAnalyticsOnly() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        persistUser("other@acme.com", Role.RECRUIT, null);
        seedTasks(tokenFor("rec@acme.com"));
        seedTasks(tokenFor("other@acme.com"));

        mockMvc.perform(get("/api/v1/analytics")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletionTrend.length()", is(1)))
                .andExpect(jsonPath("$.taskCompletionTrend[0].total", is(2)))
                .andExpect(jsonPath("$.taskCompletionTrend[0].completed", is(1)))
                .andExpect(jsonPath("$.taskCompletionTrend[0].completionRate", is(0.5)))
                .andExpect(jsonPath("$.issueSeverityDistribution.HIGH", is(1)))
                .andExpect(jsonPath("$.issueStatusDistribution.OPEN", is(1)))
                .andExpect(jsonPath("$.feedbackTypeDistribution.POSITIVE", is(1)))
                .andExpect(jsonPath("$.activityVolumeTrend.length()", is(3)));
    }

    @Test
    void managerSeesAssignedRecruitAnalytics() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("unassigned@acme.com", Role.RECRUIT, null);
        seedTasks(tokenFor("assigned@acme.com"));
        seedTasks(tokenFor("unassigned@acme.com"));

        mockMvc.perform(get("/api/v1/analytics")
                        .header("Authorization", "Bearer " + tokenFor("mgr@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletionTrend[0].total", is(2)))
                .andExpect(jsonPath("$.issueSeverityDistribution.HIGH", is(1)));
    }

    @Test
    void adminSeesAggregateAcrossUsers() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);
        seedTasks(tokenFor("r1@acme.com"));
        seedTasks(tokenFor("r2@acme.com"));

        mockMvc.perform(get("/api/v1/analytics")
                        .header("Authorization", "Bearer " + tokenFor("admin@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletionTrend[0].total", is(4)))
                .andExpect(jsonPath("$.issueSeverityDistribution.HIGH", is(2)))
                .andExpect(jsonPath("$.feedbackTypeDistribution.POSITIVE", is(2)));
    }

    @Test
    void dateRangeFilterLimitsResults() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        seedTasks(tokenFor("rec@acme.com"));

        mockMvc.perform(get("/api/v1/analytics")
                        .param("dateFrom", "2026-02-02")
                        .param("dateTo", "2026-02-02")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskCompletionTrend.length()", is(0)))
                .andExpect(jsonPath("$.issueStatusDistribution.OPEN", is(1)))
                .andExpect(jsonPath("$.activityVolumeTrend.length()", is(1)));
    }

    record LoginPayload(String email, String password) {
    }
}
