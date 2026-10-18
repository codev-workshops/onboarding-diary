package com.codev.onboardingdiary.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class AuthApiTest extends ApiTestSupport {

  private Map<String, Object> signupBody(String email) {
    Map<String, Object> body = new HashMap<>();
    body.put("name", "Alice Recruit");
    body.put("email", email);
    body.put("password", "Secret123");
    body.put("department", "Engineering");
    body.put("startDate", LocalDate.now().toString());
    return body;
  }

  @Test
  void signupCreatesRecruitIgnoringRoleAndStartsSession() throws Exception {
    MockHttpSession session = new MockHttpSession();
    Map<String, Object> body = signupBody("  Alice@Example.com ");
    body.put("role", "ADMIN");

    postAs(session, "/api/auth/signup", body)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.role").value("RECRUIT"))
        .andExpect(jsonPath("$.email").value("alice@example.com"))
        .andExpect(jsonPath("$.passwordHash").doesNotExist());

    getAs(session, "/api/auth/me")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("alice@example.com"));
  }

  @Test
  void signupRejectsDuplicateEmailCaseInsensitively() throws Exception {
    postAs(new MockHttpSession(), "/api/auth/signup", signupBody("dup@example.com"))
        .andExpect(status().isCreated());
    postAs(new MockHttpSession(), "/api/auth/signup", signupBody("DUP@example.com"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.message").value("Email already registered"));
  }

  @Test
  void signupValidatesFields() throws Exception {
    Map<String, Object> body = signupBody("not-an-email");
    body.put("password", "short");
    body.put("name", "   ");
    body.remove("startDate");

    var result =
        postAs(new MockHttpSession(), "/api/auth/signup", body).andExpect(status().isBadRequest());
    assertThat(body(result).get("fieldErrors").findValuesAsText("field"))
        .contains("email", "password", "name", "startDate");
  }

  @Test
  void loginWithWrongPasswordIsGeneric401() throws Exception {
    User user = createUser(Role.RECRUIT);
    postAs(
            new MockHttpSession(),
            "/api/auth/login",
            Map.of("email", user.getEmail(), "password", "wrong-password1"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.message").value("Invalid email or password"));
  }

  @Test
  void deactivatedUserCannotLoginAndLosesExistingSession() throws Exception {
    User user = createUser(Role.RECRUIT);
    MockHttpSession session = login(user);

    user.setActive(false);
    userRepository.save(user);

    getAs(session, "/api/auth/me").andExpect(status().isUnauthorized());
    postAs(
            new MockHttpSession(),
            "/api/auth/login",
            Map.of("email", user.getEmail(), "password", PASSWORD))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.message").value("Account is deactivated"));
  }

  @Test
  void logoutEndsSession() throws Exception {
    MockHttpSession session = login(createUser(Role.MANAGER));
    postAs(session, "/api/auth/logout", Map.of()).andExpect(status().isNoContent());
    mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
  }

  @Test
  void anonymousApiCallsReturn401Json() throws Exception {
    mvc.perform(get("/api/profile"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401));
  }

  @Test
  void stateChangingRequestWithoutCsrfIsRejected() throws Exception {
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "a@b.c", "password", "x"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void seededAdminCanLogIn() throws Exception {
    mvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", "admin@test.local", "password", "Admin1234"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("ADMIN"));
  }
}
