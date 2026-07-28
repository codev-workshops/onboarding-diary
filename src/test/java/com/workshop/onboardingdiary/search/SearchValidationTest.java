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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Search query rules of REQUIREMENTS 9.6, all reported as {@code $.errors.q}. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SearchValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    private User owner;
    private String token;

    @BeforeEach
    void setUp() {
        owner = testUsers.create("search-validation@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(owner.getEmail(), owner.getRole());
    }

    @Test
    void aMissingQueryIsRejected() throws Exception {
        mockMvc.perform(get("/api/search").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.q").value("Search query is required"));
    }

    @Test
    void anEmptyQueryIsRejected() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.q").value("Search query is required"));
    }

    @Test
    void aWhitespaceOnlyQueryIsRejected() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "   ").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.q").value("Search query is required"));
    }

    @Test
    void aQueryShorterThanTwoCharactersIsRejected() throws Exception {
        mockMvc.perform(get("/api/search").param("q", " a ").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.q").value("Search query must be at least 2 characters"));
    }

    @Test
    void aQueryLongerThanOneHundredCharactersIsRejected() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "x".repeat(101))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.q").value("Search query may be at most 100 characters"));

        mockMvc.perform(get("/api/search").param("q", "x".repeat(100))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void aQueryIsTrimmedAndItsInternalWhitespaceCollapsed() throws Exception {
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 1), "Onboarding checklist", null);

        mockMvc.perform(get("/api/search").param("q", "  Onboarding    checklist  ")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("Onboarding checklist"))
                .andExpect(jsonPath("$.totalResults").value(1))
                .andExpect(jsonPath("$.results.tasks.items[0].title").value("Onboarding checklist"));
    }

    @Test
    void sqlWildcardsInTheQueryAreMatchedLiterally() throws Exception {
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 1), "Progress 50% done", null);
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 2), "Progress 50 percent done", null);
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 3), "Report_final draft", null);
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 4), "Reportxfinal draft", null);

        mockMvc.perform(get("/api/search").param("q", "50% done")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.tasks.count").value(1))
                .andExpect(jsonPath("$.results.tasks.items[0].title").value("Progress 50% done"));

        mockMvc.perform(get("/api/search").param("q", "report_final")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.tasks.count").value(1))
                .andExpect(jsonPath("$.results.tasks.items[0].title").value("Report_final draft"));
    }

    @Test
    void aBackslashInTheQueryIsMatchedLiterally() throws Exception {
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 1), "Path C:\\tools setup", null);
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 2), "Path C:tools setup", null);

        mockMvc.perform(get("/api/search").param("q", "C:\\tools")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.tasks.count").value(1))
                .andExpect(jsonPath("$.results.tasks.items[0].title").value("Path C:\\tools setup"));
    }

    @Test
    void enumAndDateParametersAreIgnoredRatherThanRejected() throws Exception {
        testEntries.taskWithText(owner, LocalDate.of(2026, 2, 1), "Onboarding checklist", null);

        mockMvc.perform(get("/api/search")
                        .param("q", "onboarding")
                        .param("status", "NOT_A_STATUS")
                        .param("dateFrom", "not-a-date")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(1));
    }
}
