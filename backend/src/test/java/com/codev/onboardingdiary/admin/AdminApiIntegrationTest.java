package com.codev.onboardingdiary.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminApiIntegrationTest extends ApiTestSupport {

  private String admin;
  private long adminId;

  @BeforeEach
  void setUp() throws Exception {
    admin = adminToken();
    adminId = userId(admin);
  }

  @Test
  void createdUserMustChangeTemporaryPasswordAndIsAudited() throws Exception {
    String email = randomEmail("new");
    long id = createUser(admin, email, Role.RECRUIT);

    String token = login(email, TEMP_PASSWORD);
    getJson(token, "/api/auth/me").andExpect(jsonPath("$.mustChangePassword").value(true));
    getJson(admin, "/api/admin/audit-log?action=USER_CREATED&userId=" + id)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].actor.id").value(adminId))
        .andExpect(jsonPath("$.content[0].target.email").value(email));
  }

  @Test
  void createRejectsDuplicateEmailAndWeakPassword() throws Exception {
    String email = randomEmail("dup");
    createUser(admin, email, Role.RECRUIT);
    Map<String, Object> body =
        Map.of(
            "email",
            email.toUpperCase(),
            "temporaryPassword",
            TEMP_PASSWORD,
            "fullName",
            "Dup",
            "department",
            "Ops",
            "startDate",
            START_DATE.toString(),
            "roles",
            List.of("RECRUIT"));
    postJson(admin, "/api/admin/users", body).andExpect(status().isConflict());

    Map<String, Object> weak = new java.util.HashMap<>(body);
    weak.put("email", randomEmail("weak"));
    weak.put("temporaryPassword", "short");
    postJson(admin, "/api/admin/users", weak)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("temporaryPassword"));
  }

  @Test
  void listFiltersByTextRoleAndStatus() throws Exception {
    String email = randomEmail("findme");
    long id = createUser(admin, email, Role.MANAGER);

    getJson(admin, "/api/admin/users?q=" + email.substring(0, 20) + "&role=MANAGER")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].id").value(id))
        .andExpect(jsonPath("$.content[0].roles[0]").value("MANAGER"));
    getJson(admin, "/api/admin/users?q=" + email.substring(0, 20) + "&role=RECRUIT")
        .andExpect(jsonPath("$.totalElements").value(0));
    getJson(admin, "/api/admin/users?q=" + email.substring(0, 20) + "&enabled=false")
        .andExpect(jsonPath("$.totalElements").value(0));
    getJson(admin, "/api/admin/managers").andExpect(jsonPath("$[*].id", hasItem((int) id)));
  }

  @Test
  void adminCannotRemoveOwnAdminRoleOrDisableThemselves() throws Exception {
    putJson(admin, "/api/admin/users/" + adminId + "/roles", Map.of("roles", List.of("MANAGER")))
        .andExpect(status().isConflict());
    patchJson(admin, "/api/admin/users/" + adminId + "/status", Map.of("enabled", false))
        .andExpect(status().isConflict());
  }

  @Test
  void managerWithRecruitsKeepsRoleUntilReassigned() throws Exception {
    long managerId = createUser(admin, randomEmail("mgr"), Role.MANAGER);
    long recruitId = createUser(admin, randomEmail("rec"), Role.RECRUIT);
    putJson(admin, "/api/admin/users/" + recruitId + "/manager", Map.of("managerId", managerId))
        .andExpect(jsonPath("$.profile.managerId").value(managerId));

    putJson(admin, "/api/admin/users/" + managerId + "/roles", Map.of("roles", List.of("RECRUIT")))
        .andExpect(status().isConflict());

    putJson(admin, "/api/admin/users/" + recruitId + "/manager", new java.util.HashMap<>())
        .andExpect(jsonPath("$.profile.managerId").doesNotExist());
    putJson(admin, "/api/admin/users/" + managerId + "/roles", Map.of("roles", List.of("RECRUIT")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles[0]").value("RECRUIT"));
  }

  @Test
  void managerAssignmentRequiresActiveManager() throws Exception {
    long recruitId = createUser(admin, randomEmail("rec"), Role.RECRUIT);
    long otherRecruit = createUser(admin, randomEmail("rec"), Role.RECRUIT);

    putJson(admin, "/api/admin/users/" + recruitId + "/manager", Map.of("managerId", otherRecruit))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("managerId"));
  }

  @Test
  void roleChangesApplyToExistingTokensImmediately() throws Exception {
    String email = randomEmail("demoted");
    long id = createUser(admin, email, Role.MANAGER);
    String token = login(email, TEMP_PASSWORD);
    getJson(token, "/api/manager/recruits").andExpect(status().isOk());

    putJson(admin, "/api/admin/users/" + id + "/roles", Map.of("roles", List.of("RECRUIT")))
        .andExpect(status().isOk());

    getJson(token, "/api/manager/recruits").andExpect(status().isForbidden());
  }

  @Test
  void disablingBlocksLoginAndKeepsData() throws Exception {
    String email = randomEmail("disabled");
    long id = createUser(admin, email, Role.RECRUIT);
    String token = login(email, TEMP_PASSWORD);

    patchJson(admin, "/api/admin/users/" + id + "/status", Map.of("enabled", false))
        .andExpect(jsonPath("$.enabled").value(false));

    getJson(token, "/api/auth/me").andExpect(status().isUnauthorized());
    loginRequest(email, TEMP_PASSWORD).andExpect(status().isForbidden());
    getJson(admin, "/api/admin/users/" + id).andExpect(status().isOk());

    patchJson(admin, "/api/admin/users/" + id + "/status", Map.of("enabled", true))
        .andExpect(jsonPath("$.enabled").value(true));
    login(email, TEMP_PASSWORD);
    getJson(admin, "/api/admin/audit-log?userId=" + id + "&action=USER_DISABLED")
        .andExpect(jsonPath("$.totalElements").value(1));
  }

  @Test
  void resetPasswordIssuesTemporaryPassword() throws Exception {
    String email = randomEmail("reset");
    long id = createUser(admin, email, Role.RECRUIT);

    String temporary =
        body(postJson(admin, "/api/admin/users/" + id + "/reset-password", Map.of()))
            .get("temporaryPassword")
            .asText();

    assertThat(temporary).matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$");
    loginRequest(email, TEMP_PASSWORD).andExpect(status().isUnauthorized());
    getJson(login(email, temporary), "/api/auth/me")
        .andExpect(jsonPath("$.mustChangePassword").value(true));
    String audit =
        body(getJson(admin, "/api/admin/audit-log?userId=" + id + "&action=PASSWORD_RESET"))
            .toString();
    assertThat(audit).doesNotContain(temporary);
  }

  @Test
  void adminCanEditProfile() throws Exception {
    long id = createUser(admin, randomEmail("edit"), Role.RECRUIT);
    putJson(
            admin,
            "/api/admin/users/" + id + "/profile",
            Map.of(
                "fullName", "Renamed User",
                "department", "Finance",
                "startDate", START_DATE.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.fullName").value("Renamed User"))
        .andExpect(jsonPath("$.profile.department").value("Finance"));
  }

  @Test
  void nonAdminsAreForbidden() throws Exception {
    String recruit = signupRecruit();
    getJson(recruit, "/api/admin/users").andExpect(status().isForbidden());
    getJson(recruit, "/api/admin/audit-log").andExpect(status().isForbidden());
  }

  private org.springframework.test.web.servlet.ResultActions loginRequest(
      String email, String password) throws Exception {
    return mockMvc.perform(
        post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                objectMapper.writeValueAsString(Map.of("email", email, "password", password))));
  }
}
