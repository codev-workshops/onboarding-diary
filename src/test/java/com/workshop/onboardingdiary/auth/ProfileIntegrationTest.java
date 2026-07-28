package com.workshop.onboardingdiary.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.UserRepository;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestUsers;
import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Phase 2 profile view and self edit (REQUIREMENTS US-R03, section 4.1). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProfileIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    private String token;

    @BeforeEach
    void createUser() {
        User user = testUsers.create("recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        token = jwtService.issueToken(user.getEmail(), user.getRole());
    }

    @Test
    void profileRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void profileIsReturnedWithoutThePasswordHash() throws Exception {
        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.email").value("recruit@example.com"))
                .andExpect(jsonPath("$.role").value("NEW_RECRUIT"))
                .andExpect(jsonPath("$.department").value("Engineering"))
                .andExpect(jsonPath("$.startDate").value("2026-01-05"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void theTokenCookieAlsoAuthenticatesPageRequests() throws Exception {
        mockMvc.perform(get("/api/me").cookie(new Cookie("ACCESS_TOKEN", token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("recruit@example.com"));
    }

    @Test
    void selfEditUpdatesNameDepartmentAndStartDate() throws Exception {
        mockMvc.perform(updateProfile(Map.of(
                        "name", "Renamed Recruit",
                        "department", "Product",
                        "startDate", "2026-03-09")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed Recruit"))
                .andExpect(jsonPath("$.department").value("Product"))
                .andExpect(jsonPath("$.startDate").value("2026-03-09"));

        User stored = userRepository.findByEmailIgnoreCase("recruit@example.com").orElseThrow();
        assertThat(stored.getName()).isEqualTo("Renamed Recruit");
        assertThat(stored.getDepartment().getName()).isEqualTo("Product");
        assertThat(stored.getStartDate()).isEqualTo(LocalDate.of(2026, 3, 9));
    }

    @Test
    void emailAndRoleCannotBeChangedThroughTheProfileEndpoint() throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of(
                "name", "Still Me",
                "department", "Engineering",
                "startDate", "2026-01-05",
                "email", "hijacked@example.com",
                "role", "ADMIN"));

        mockMvc.perform(updateProfile(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("recruit@example.com"))
                .andExpect(jsonPath("$.role").value("NEW_RECRUIT"));

        assertThat(userRepository.findByEmailIgnoreCase("hijacked@example.com")).isEmpty();
        User stored = userRepository.findByEmailIgnoreCase("recruit@example.com").orElseThrow();
        assertThat(stored.getRole()).isEqualTo(Role.NEW_RECRUIT);
    }

    @Test
    void validationErrorsAreReportedPerFieldAndNothingIsSaved() throws Exception {
        mockMvc.perform(updateProfile(new HashMap<>(Map.of("name", "", "department", "Engineering"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").isNotEmpty())
                .andExpect(jsonPath("$.errors.startDate").value("Start date is required"));

        mockMvc.perform(updateProfile(Map.of(
                        "name", "Partial Update",
                        "department", "Ministry of Silly Walks",
                        "startDate", "2026-03-09")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.department").value("Unknown department"));

        User stored = userRepository.findByEmailIgnoreCase("recruit@example.com").orElseThrow();
        assertThat(stored.getName()).isEqualTo("Test User");
        assertThat(stored.getStartDate()).isEqualTo(LocalDate.of(2026, 1, 5));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder updateProfile(
            Map<String, ?> body) throws Exception {
        return put("/api/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
    }
}
