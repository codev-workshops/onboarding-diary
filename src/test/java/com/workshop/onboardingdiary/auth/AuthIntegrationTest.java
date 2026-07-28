package com.workshop.onboardingdiary.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.workshop.onboardingdiary.entity.Department;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import com.workshop.onboardingdiary.support.TestUsers;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/** Phase 2 sign-up, login and logout behaviour (REQUIREMENTS US-R01, US-R02). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthIntegrationTest {

    private static final String COOKIE = "ACCESS_TOKEN";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TestUsers testUsers;

    @Test
    void signupCreatesAnAuthenticatedNewRecruitWithAHashedPassword() throws Exception {
        MvcResult result = mockMvc.perform(signup(Map.of(
                        "name", "Ada Lovelace",
                        "email", "Ada@Example.com",
                        "password", "sup3rsecret",
                        "department", "Engineering",
                        "startDate", "2026-02-01")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("NEW_RECRUIT"))
                .andExpect(jsonPath("$.user.email").value("ada@example.com"))
                .andExpect(jsonPath("$.user.department").value("Engineering"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.password").doesNotExist())
                .andExpect(cookie().exists(COOKIE))
                .andExpect(cookie().httpOnly(COOKIE, true))
                .andReturn();

        User stored = userRepository.findByEmailIgnoreCase("ada@example.com").orElseThrow();
        assertThat(stored.getPasswordHash()).isNotEqualTo("sup3rsecret");
        assertThat(stored.getPasswordHash()).startsWith("$2");
        assertThat(passwordEncoder.matches("sup3rsecret", stored.getPasswordHash())).isTrue();
        assertThat(stored.getRole()).isEqualTo(Role.NEW_RECRUIT);

        // The issued token authenticates the new user straight away.
        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + token(result)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ada@example.com"));
    }

    @Test
    void signupRejectsADuplicateEmailIgnoringCase() throws Exception {
        testUsers.create("taken@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);

        mockMvc.perform(signup(Map.of(
                        "name", "Someone Else",
                        "email", "TAKEN@example.com",
                        "password", "sup3rsecret",
                        "department", "Engineering",
                        "startDate", "2026-02-01")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").value("An account with this email already exists"));
    }

    @Test
    void signupRejectsAnInvalidEmailFormat() throws Exception {
        mockMvc.perform(signup(Map.of(
                        "name", "Ada",
                        "email", "not-an-email",
                        "password", "sup3rsecret",
                        "department", "Engineering",
                        "startDate", "2026-02-01")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").value("Email must be a valid email address"));
    }

    @Test
    void signupRejectsAShortPassword() throws Exception {
        mockMvc.perform(signup(Map.of(
                        "name", "Ada",
                        "email", "short@example.com",
                        "password", "short",
                        "department", "Engineering",
                        "startDate", "2026-02-01")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").value("Password must be at least 8 characters"));
    }

    @Test
    void signupRejectsMissingRequiredFields() throws Exception {
        mockMvc.perform(signup(Map.of()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.name").value("Name is required"))
                .andExpect(jsonPath("$.errors.email").value("Email is required"))
                .andExpect(jsonPath("$.errors.password").value("Password is required"))
                .andExpect(jsonPath("$.errors.department").value("Department is required"))
                .andExpect(jsonPath("$.errors.startDate").value("Start date is required"));
    }

    @Test
    void signupRejectsAnUnknownDepartment() throws Exception {
        mockMvc.perform(signup(Map.of(
                        "name", "Ada",
                        "email", "unknown-dept@example.com",
                        "password", "sup3rsecret",
                        "department", "Ministry of Silly Walks",
                        "startDate", "2026-02-01")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.department").value("Unknown department"));

        assertThat(userRepository.findByEmailIgnoreCase("unknown-dept@example.com")).isEmpty();
    }

    @Test
    void signupRejectsAnInactiveDepartment() throws Exception {
        Department department = departmentRepository.findByNameIgnoreCase("Design").orElseThrow();
        department.setActive(false);
        departmentRepository.saveAndFlush(department);

        mockMvc.perform(signup(Map.of(
                        "name", "Ada",
                        "email", "inactive-dept@example.com",
                        "password", "sup3rsecret",
                        "department", "Design",
                        "startDate", "2026-02-01")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.department").value("Department is not active"));
    }

    @Test
    void loginIssuesATokenAndSetsTheCookie() throws Exception {
        testUsers.create("login@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);

        mockMvc.perform(login("login@example.com", "sup3rsecret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("login@example.com"))
                .andExpect(cookie().exists(COOKIE))
                .andExpect(cookie().httpOnly(COOKIE, true));
    }

    @Test
    void loginFailuresAreIndistinguishableAndGeneric() throws Exception {
        testUsers.create("known@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);

        String wrongPassword = mockMvc.perform(login("known@example.com", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andExpect(cookie().doesNotExist(COOKIE))
                .andReturn().getResponse().getContentAsString();

        String unknownUser = mockMvc.perform(login("nobody@example.com", "sup3rsecret"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andReturn().getResponse().getContentAsString();

        assertThat(unknownUser).isEqualTo(wrongPassword);
    }

    @Test
    void deactivatedUsersCannotLogIn() throws Exception {
        testUsers.create("inactive@example.com", "sup3rsecret", Role.NEW_RECRUIT, false);

        mockMvc.perform(login("inactive@example.com", "sup3rsecret"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void logoutReturns204AndClearsTheCookie() throws Exception {
        testUsers.create("logout@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        String token = token(mockMvc.perform(login("logout@example.com", "sup3rsecret")).andReturn());

        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent())
                .andExpect(cookie().value(COOKIE, ""))
                .andExpect(cookie().maxAge(COOKIE, 0));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder signup(Map<String, ?> body)
            throws Exception {
        return post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder login(String email,
                                                                                             String password)
            throws Exception {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password)));
    }

    private String token(MvcResult result) throws Exception {
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("token").asText();
    }
}
