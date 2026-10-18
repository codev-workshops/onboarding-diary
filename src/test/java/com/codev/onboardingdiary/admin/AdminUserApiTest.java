package com.codev.onboardingdiary.admin;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class AdminUserApiTest extends ApiTestSupport {

  private static Map<String, Object> update(User user, Role role, Long managerId, boolean active) {
    Map<String, Object> body = new HashMap<>();
    body.put("name", user.getName());
    body.put("role", role);
    body.put("department", "Ops");
    body.put("startDate", role == Role.RECRUIT ? LocalDate.now().toString() : null);
    body.put("managerId", managerId);
    body.put("active", active);
    return body;
  }

  @Test
  void adminCreatesManagerAndAssignsRecruit() throws Exception {
    MockHttpSession admin = login(createUser(Role.ADMIN));
    Map<String, Object> create = new HashMap<>();
    create.put("name", "New Manager");
    create.put("email", "  New.Manager" + System.nanoTime() + "@Test.local ");
    create.put("password", "Manager123");
    create.put("role", "MANAGER");
    long managerId =
        body(postAs(admin, "/api/admin/users", create)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("MANAGER")))
            .get("id")
            .asLong();

    User recruit = createUser(Role.RECRUIT);
    putAs(admin, "/api/admin/users/" + recruit.getId(), update(recruit, Role.RECRUIT, managerId, true))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.manager.id").value(managerId));

    getAs(admin, "/api/admin/managers").andExpect(status().isOk());
    getAs(admin, "/api/admin/users?role=MANAGER&q=new manager")
        .andExpect(jsonPath("$.content[0].id").value(managerId));
  }

  @Test
  void managerAssignmentRules() throws Exception {
    MockHttpSession admin = login(createUser(Role.ADMIN));
    User manager = createUser(Role.MANAGER);
    User recruit = createUser(Role.RECRUIT, manager);
    User otherRecruit = createUser(Role.RECRUIT);

    putAs(admin, "/api/admin/users/" + recruit.getId(),
            update(recruit, Role.RECRUIT, otherRecruit.getId(), true))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("managerId"));
    putAs(admin, "/api/admin/users/" + manager.getId(),
            update(manager, Role.MANAGER, manager.getId(), true))
        .andExpect(status().isBadRequest());

    putAs(admin, "/api/admin/users/" + manager.getId(), update(manager, Role.ADMIN, null, true))
        .andExpect(status().isOk());
    getAs(admin, "/api/admin/users/" + recruit.getId())
        .andExpect(jsonPath("$.manager").isEmpty());
  }

  @Test
  void adminCannotDeactivateSelfOrRemoveLastAdmin() throws Exception {
    User self = createUser(Role.ADMIN);
    MockHttpSession admin = login(self);
    putAs(admin, "/api/admin/users/" + self.getId(), update(self, Role.ADMIN, null, false))
        .andExpect(status().isConflict());

    List<User> others =
        userRepository.findAll().stream()
            .filter(u -> u.hasRole(Role.ADMIN) && u.isActive() && !u.getId().equals(self.getId()))
            .toList();
    others.forEach(u -> u.setActive(false));
    userRepository.saveAll(others);
    try {
      putAs(admin, "/api/admin/users/" + self.getId(), update(self, Role.MANAGER, null, true))
          .andExpect(status().isConflict());
    } finally {
      others.forEach(u -> u.setActive(true));
      userRepository.saveAll(others);
    }
  }

  @Test
  void deactivatedUserCannotLogInAndPasswordResetWorks() throws Exception {
    MockHttpSession admin = login(createUser(Role.ADMIN));
    User recruit = createUser(Role.RECRUIT);
    MockHttpSession recruitSession = login(recruit);

    putAs(admin, "/api/admin/users/" + recruit.getId() + "/password",
            Map.of("newPassword", "short"))
        .andExpect(status().isBadRequest());
    putAs(admin, "/api/admin/users/" + recruit.getId() + "/password",
            Map.of("newPassword", "Changed123"))
        .andExpect(status().isNoContent());
    postAs(new MockHttpSession(), "/api/auth/login",
            Map.of("email", recruit.getEmail(), "password", "Changed123"))
        .andExpect(status().isOk());

    putAs(admin, "/api/admin/users/" + recruit.getId(), update(recruit, Role.RECRUIT, null, false))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.active").value(false));
    getAs(recruitSession, "/api/tasks").andExpect(status().isUnauthorized());
  }

  @Test
  void nonAdminsAreForbidden() throws Exception {
    getAs(login(createUser(Role.MANAGER)), "/api/admin/users").andExpect(status().isForbidden());
    getAs(login(createUser(Role.RECRUIT)), "/api/admin/users").andExpect(status().isForbidden());
  }
}
