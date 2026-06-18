package com.onboardingdiary.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardingdiary.AbstractIntegrationTest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class ReportApiIntegrationTest extends AbstractIntegrationTest {

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
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private static final String PASSWORD = "password12345";

    @BeforeEach
    void cleanDb() {
        taskRepository.deleteAll();
        issueRepository.deleteAll();
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

    private void create(String path, String token, String json) throws Exception {
        mockMvc.perform(post("/api/v1/" + path)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated());
    }

    private void seedFullSet(String token, String marker) throws Exception {
        create("tasks", token, """
                {"date":"2026-02-01","title":"Task %s","category":"LEARNING","status":"DONE","priority":"LOW"}
                """.formatted(marker));
        create("issues", token, """
                {"date":"2026-02-02","title":"Issue %s","severity":"HIGH","status":"OPEN"}
                """.formatted(marker));
        create("feedback", token, """
                {"date":"2026-02-03","subject":"Feedback %s","type":"POSITIVE"}
                """.formatted(marker));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/reports").param("type", "TASKS"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void recruitCsvContainsOnlyOwnRows() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        persistUser("other@acme.com", Role.RECRUIT, null);
        seedFullSet(tokenFor("rec@acme.com"), "MINE");
        seedFullSet(tokenFor("other@acme.com"), "THEIRS");

        String csv = mockMvc.perform(get("/api/v1/reports")
                        .param("type", "TASKS")
                        .param("format", "CSV")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(new MediaType("text", "csv")))
                .andExpect(header().string("Content-Disposition", containsString("tasks-report-")))
                .andReturn().getResponse().getContentAsString();

        assertThat(csv).contains("Task MINE");
        assertThat(csv).doesNotContain("Task THEIRS");
        assertThat(csv).contains("Date,Owner,Title,Category,Status,Priority,Description");
    }

    @Test
    void combinedCsvHasAllThreeSectionBanners() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        seedFullSet(tokenFor("rec@acme.com"), "X");

        String csv = mockMvc.perform(get("/api/v1/reports")
                        .param("type", "COMBINED")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(csv).contains("# Tasks", "# Issues", "# Feedback");
        assertThat(csv).contains("Task X", "Issue X", "Feedback X");
    }

    @Test
    void pdfFormatReturnsPdfBytes() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        seedFullSet(tokenFor("rec@acme.com"), "X");

        byte[] pdf = mockMvc.perform(get("/api/v1/reports")
                        .param("type", "COMBINED")
                        .param("format", "PDF")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString(".pdf")))
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(new String(pdf, 0, 5, StandardCharsets.ISO_8859_1)).startsWith("%PDF");
    }

    @Test
    void managerCannotReportOnUnassignedOwner() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        User unassigned = persistUser("unassigned@acme.com", Role.RECRUIT, null);

        mockMvc.perform(get("/api/v1/reports")
                        .param("type", "TASKS")
                        .param("ownerId", String.valueOf(unassigned.getId()))
                        .header("Authorization", "Bearer " + tokenFor("mgr@acme.com")))
                .andExpect(status().isForbidden());
    }

    @Test
    void invertedDateRangeIsRejected() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);

        mockMvc.perform(get("/api/v1/reports")
                        .param("type", "TASKS")
                        .param("dateFrom", "2026-03-01")
                        .param("dateTo", "2026-02-01")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCsvIncludesAllUsersRows() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);
        seedFullSet(tokenFor("r1@acme.com"), "ONE");
        seedFullSet(tokenFor("r2@acme.com"), "TWO");

        String csv = mockMvc.perform(get("/api/v1/reports")
                        .param("type", "ISSUES")
                        .header("Authorization", "Bearer " + tokenFor("admin@acme.com")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(csv).contains("Issue ONE", "Issue TWO");
    }

    @Test
    void invalidReportTypeIsRejected() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);

        mockMvc.perform(get("/api/v1/reports")
                        .param("type", "BOGUS")
                        .header("Authorization", "Bearer " + tokenFor("rec@acme.com")))
                .andExpect(status().is4xxClientError());
    }

    record LoginPayload(String email, String password) {
    }
}
