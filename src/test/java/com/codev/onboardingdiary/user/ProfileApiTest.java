package com.codev.onboardingdiary.user;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class ProfileApiTest extends ApiTestSupport {

  @Test
  void recruitUpdatesEditableFieldsOnly() throws Exception {
    User manager = createUser(Role.MANAGER);
    User recruit = createUser(Role.RECRUIT, manager);
    MockHttpSession session = login(recruit);

    Map<String, Object> body = new HashMap<>();
    body.put("name", "Renamed");
    body.put("department", "  ");
    body.put("startDate", LocalDate.now().minusDays(3).toString());
    body.put("role", "ADMIN");
    body.put("email", "hijack@test.local");

    putAs(session, "/api/profile", body)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Renamed"))
        .andExpect(jsonPath("$.department").isEmpty())
        .andExpect(jsonPath("$.role").value("RECRUIT"))
        .andExpect(jsonPath("$.email").value(recruit.getEmail()))
        .andExpect(jsonPath("$.manager.name").value(manager.getName()));
  }

  @Test
  void recruitStartDateIsRequired() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    Map<String, Object> body = new HashMap<>();
    body.put("name", "Name");
    body.put("startDate", null);
    putAs(session, "/api/profile", body)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("startDate"));
  }

  @Test
  void changePasswordRequiresCurrentPassword() throws Exception {
    User user = createUser(Role.MANAGER);
    MockHttpSession session = login(user);

    putAs(
            session,
            "/api/profile/password",
            Map.of("currentPassword", "wrong", "newPassword", "NewPass123"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("currentPassword"));

    putAs(
            session,
            "/api/profile/password",
            Map.of("currentPassword", PASSWORD, "newPassword", "NewPass123"))
        .andExpect(status().isNoContent());
  }
}
