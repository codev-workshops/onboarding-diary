package com.onboardingdiary.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardingdiary.AbstractIntegrationTest;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class TaskApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ObjectMapper objectMapper;

    private static final String PASSWORD = "password12345";

    @BeforeEach
    void cleanDb() {
        taskRepository.deleteAll();
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

    private long createTask(String token, String body) throws Exception {
        String response = mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/tasks")).andExpect(status().isUnauthorized());
    }

    @Test
    void recruitCanCreateGetUpdateDeleteOwnTask() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");

        long id = createTask(token, """
                {"date":"2026-02-01","title":"Read handbook","description":"intro docs",
                 "category":"LEARNING","status":"TODO","priority":"HIGH"}
                """);

        mockMvc.perform(get("/api/v1/tasks/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Read handbook")))
                .andExpect(jsonPath("$.category", is("LEARNING")))
                .andExpect(jsonPath("$.priority", is("HIGH")));

        mockMvc.perform(put("/api/v1/tasks/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"2026-02-02","title":"Read handbook v2","description":"done",
                                 "category":"LEARNING","status":"DONE","priority":"LOW"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Read handbook v2")))
                .andExpect(jsonPath("$.status", is("DONE")));

        mockMvc.perform(delete("/api/v1/tasks/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/tasks/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRejectsInvalidPayload() throws Exception {
        persistUser("rec@acme.com", Role.RECRUIT, null);
        String token = tokenFor("rec@acme.com");
        mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"","category":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void recruitCannotReadOrModifyOthersTask() throws Exception {
        User owner = persistUser("owner@acme.com", Role.RECRUIT, null);
        persistUser("intruder@acme.com", Role.RECRUIT, null);
        String ownerToken = tokenFor("owner@acme.com");
        String intruderToken = tokenFor("intruder@acme.com");

        long id = createTask(ownerToken, """
                {"date":"2026-02-01","title":"Private","category":"OTHER"}
                """);

        mockMvc.perform(get("/api/v1/tasks/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/v1/tasks/" + id).header("Authorization", "Bearer " + intruderToken))
                .andExpect(status().isNotFound());
        // owner's task untouched
        org.assertj.core.api.Assertions.assertThat(taskRepository.findById(id)).isPresent();
        org.assertj.core.api.Assertions.assertThat(owner.getId()).isNotNull();
    }

    @Test
    void managerSeesAssignedRecruitTasksButNotUnassigned() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        persistUser("unassigned@acme.com", Role.RECRUIT, null);

        String assignedToken = tokenFor("assigned@acme.com");
        String unassignedToken = tokenFor("unassigned@acme.com");
        String managerToken = tokenFor("mgr@acme.com");

        createTask(assignedToken, """
                {"date":"2026-02-01","title":"Assigned task","category":"SETUP"}
                """);
        createTask(unassignedToken, """
                {"date":"2026-02-01","title":"Unassigned task","category":"SETUP"}
                """);

        mockMvc.perform(get("/api/v1/tasks").header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("Assigned task")));
    }

    @Test
    void managerCannotFilterByUnassignedOwner() throws Exception {
        User manager = persistUser("mgr@acme.com", Role.MANAGER, null);
        persistUser("assigned@acme.com", Role.RECRUIT, manager.getId());
        User unassigned = persistUser("unassigned@acme.com", Role.RECRUIT, null);
        String managerToken = tokenFor("mgr@acme.com");

        mockMvc.perform(get("/api/v1/tasks")
                        .param("ownerId", String.valueOf(unassigned.getId()))
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminSeesAllTasksAndCanFilter() throws Exception {
        persistUser("admin@acme.com", Role.ADMIN, null);
        User r1 = persistUser("r1@acme.com", Role.RECRUIT, null);
        persistUser("r2@acme.com", Role.RECRUIT, null);
        String adminToken = tokenFor("admin@acme.com");
        String t1 = tokenFor("r1@acme.com");
        String t2 = tokenFor("r2@acme.com");

        createTask(t1, """
                {"date":"2026-02-01","title":"R1 high","category":"SETUP","priority":"HIGH","status":"TODO"}
                """);
        createTask(t2, """
                {"date":"2026-03-01","title":"R2 low","category":"MEETING","priority":"LOW","status":"DONE"}
                """);

        mockMvc.perform(get("/api/v1/tasks").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(2)));

        mockMvc.perform(get("/api/v1/tasks")
                        .param("priority", "HIGH")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("R1 high")));

        mockMvc.perform(get("/api/v1/tasks")
                        .param("ownerId", String.valueOf(r1.getId()))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));

        mockMvc.perform(get("/api/v1/tasks")
                        .param("status", "DONE")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("R2 low")));

        mockMvc.perform(get("/api/v1/tasks")
                        .param("search", "r1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)));

        mockMvc.perform(get("/api/v1/tasks")
                        .param("dateFrom", "2026-02-15")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.content[0].title", is("R2 low")));
    }

    record LoginPayload(String email, String password) {
    }
}
