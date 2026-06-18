package com.onboardingdiary.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardingdiary.AbstractIntegrationTest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class UserApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private static final String PASSWORD = "password12345";

    @BeforeEach
    void cleanDb() {
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

    @Test
    void loginReturnsTokenForValidCredentials() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        String token = tokenFor("admin@acme.com");
        org.assertj.core.api.Assertions.assertThat(token).isNotBlank();
    }

    @Test
    void loginRejectsInvalidCredentials() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        String body = objectMapper.writeValueAsString(new LoginPayload("admin@acme.com", "wrongpassword"));
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanCreateAndListUsers() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        String token = tokenFor("admin@acme.com");

        String createBody = """
                {"name":"Alex","email":"alex@acme.com","role":"RECRUIT","password":"password12345"}
                """;
        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("alex@acme.com")))
                .andExpect(jsonPath("$.role", is("RECRUIT")));

        mockMvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(2)));
    }

    @Test
    void createRejectsDuplicateEmailWithConflict() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        String token = tokenFor("admin@acme.com");
        String createBody = """
                {"name":"Dup","email":"admin@acme.com","role":"RECRUIT","password":"password12345"}
                """;
        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isConflict());
    }

    @Test
    void createRejectsInvalidPayloadWithFieldErrors() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        String token = tokenFor("admin@acme.com");
        String createBody = """
                {"name":"","email":"not-an-email","role":"RECRUIT","password":"short"}
                """;
        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void recruitCannotCreateUsers() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");
        String createBody = """
                {"name":"Alex","email":"alex@acme.com","role":"RECRUIT","password":"password12345"}
                """;
        mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isForbidden());
    }

    @Test
    void recruitCanReadAndUpdateOwnProfile() throws Exception {
        User recruit = persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");

        mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(recruit.getId().intValue())));

        mockMvc.perform(put("/api/v1/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed\",\"department\":\"Platform\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Renamed")))
                .andExpect(jsonPath("$.department", is("Platform")));
    }

    @Test
    void managerSeesOnlyAssignedRecruits() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("other@acme.com", Role.RECRUIT, null);
        String token = tokenFor("mgr@acme.com");

        mockMvc.perform(get("/api/v1/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].email", is("assigned@acme.com")));
    }

    @Test
    void recruitCannotReadAnotherUser() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        User other = persistUser("other@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");

        mockMvc.perform(get("/api/v1/users/" + other.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminCanDisableUser() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        User target = persistUser("target@acme.com", Role.RECRUIT, null);
        String token = tokenFor("admin@acme.com");

        mockMvc.perform(delete("/api/v1/users/" + target.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        org.assertj.core.api.Assertions.assertThat(
                        userRepository.findById(target.getId()).orElseThrow().getStatus())
                .isEqualTo(UserStatus.DISABLED);
    }

    record LoginPayload(String email, String password) {
    }
}
