package com.codev.onboardingdiary.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

  private static final String PASSWORD = "Secret123";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void signupCreatesRecruitAndReturnsTokens() throws Exception {
    String email = uniqueEmail();

    mockMvc
        .perform(jsonPost("/api/auth/signup", signupBody(email, PASSWORD)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(jsonPath("$.expiresIn").value(900))
        .andExpect(jsonPath("$.user.email").value(email))
        .andExpect(jsonPath("$.user.roles", hasItem("RECRUIT")))
        .andExpect(jsonPath("$.user.profile.department").value("Engineering"))
        .andExpect(cookie().httpOnly(RefreshCookieFactory.COOKIE_NAME, true))
        .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Strict")));
  }

  @Test
  void signupRejectsDuplicateEmailCaseInsensitively() throws Exception {
    String email = uniqueEmail();
    mockMvc.perform(jsonPost("/api/auth/signup", signupBody(email, PASSWORD)));

    mockMvc
        .perform(jsonPost("/api/auth/signup", signupBody(email.toUpperCase(), PASSWORD)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.detail").value("Email already registered"));
  }

  @Test
  void signupRejectsWeakPasswordWithFieldErrors() throws Exception {
    mockMvc
        .perform(jsonPost("/api/auth/signup", signupBody(uniqueEmail(), "weak")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Validation failed"))
        .andExpect(jsonPath("$.errors[0].field").value("password"));
  }

  @Test
  void loginSucceedsWithValidCredentials() throws Exception {
    String email = signup();

    mockMvc
        .perform(jsonPost("/api/auth/login", Map.of("email", email, "password", PASSWORD)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(cookie().exists(RefreshCookieFactory.COOKIE_NAME));
  }

  @Test
  void loginWithWrongPasswordReturnsGenericError() throws Exception {
    String email = signup();

    mockMvc
        .perform(jsonPost("/api/auth/login", Map.of("email", email, "password", "Wrong1234")))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    mockMvc
        .perform(
            jsonPost(
                "/api/auth/login", Map.of("email", "nobody@example.com", "password", PASSWORD)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.detail").value("Invalid email or password"));
  }

  @Test
  void accountLocksAfterFiveFailedLogins() throws Exception {
    String email = signup();
    for (int attempt = 0; attempt < 5; attempt++) {
      mockMvc
          .perform(jsonPost("/api/auth/login", Map.of("email", email, "password", "Wrong1234")))
          .andExpect(status().isUnauthorized());
    }

    mockMvc
        .perform(jsonPost("/api/auth/login", Map.of("email", email, "password", PASSWORD)))
        .andExpect(status().isLocked());
  }

  @Test
  void meRequiresAuthentication() throws Exception {
    mockMvc
        .perform(get("/api/auth/me"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401));
    mockMvc
        .perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void meReturnsCurrentUser() throws Exception {
    String email = uniqueEmail();
    String token = accessToken(signupResult(email));

    mockMvc
        .perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email))
        .andExpect(jsonPath("$.profile.fullName").value("Test Recruit"));
  }

  @Test
  void refreshRotatesTokenAndDetectsReuse() throws Exception {
    Cookie original = refreshCookie(signupResult(uniqueEmail()));

    MvcResult refreshed =
        mockMvc
            .perform(post("/api/auth/refresh").cookie(original))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andReturn();
    Cookie rotated = refreshCookie(refreshed);
    assertThat(rotated.getValue()).isNotEqualTo(original.getValue());

    mockMvc
        .perform(post("/api/auth/refresh").cookie(original))
        .andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/auth/refresh").cookie(rotated)).andExpect(status().isUnauthorized());
  }

  @Test
  void refreshRejectsUnknownOrigin() throws Exception {
    Cookie cookie = refreshCookie(signupResult(uniqueEmail()));

    mockMvc
        .perform(
            post("/api/auth/refresh")
                .cookie(cookie)
                .header(HttpHeaders.ORIGIN, "https://evil.test"))
        .andExpect(status().isForbidden());
  }

  @Test
  void logoutRevokesRefreshToken() throws Exception {
    Cookie cookie = refreshCookie(signupResult(uniqueEmail()));

    mockMvc
        .perform(post("/api/auth/logout").cookie(cookie))
        .andExpect(status().isNoContent())
        .andExpect(cookie().maxAge(RefreshCookieFactory.COOKIE_NAME, 0));
    mockMvc.perform(post("/api/auth/refresh").cookie(cookie)).andExpect(status().isUnauthorized());
  }

  @Test
  void changePasswordRequiresCurrentPassword() throws Exception {
    String email = uniqueEmail();
    String token = accessToken(signupResult(email));

    mockMvc
        .perform(
            jsonPut(
                    "/api/auth/password",
                    Map.of("currentPassword", "Wrong1234", "newPassword", "NewSecret123"))
                .header(HttpHeaders.AUTHORIZATION, bearer(token)))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(
            jsonPut(
                    "/api/auth/password",
                    Map.of("currentPassword", PASSWORD, "newPassword", "NewSecret123"))
                .header(HttpHeaders.AUTHORIZATION, bearer(token)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(jsonPost("/api/auth/login", Map.of("email", email, "password", "NewSecret123")))
        .andExpect(status().isOk());
  }

  @Test
  void seededAdminCanLogIn() throws Exception {
    mockMvc
        .perform(
            jsonPost(
                "/api/auth/login", Map.of("email", "admin@example.com", "password", "Admin@12345")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.roles", hasItem("ADMIN")));
  }

  @Test
  void recruitIsForbiddenFromAdminAndManagerEndpoints() throws Exception {
    String token = accessToken(signupResult(uniqueEmail()));

    mockMvc
        .perform(get("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer(token)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/manager/recruits").header(HttpHeaders.AUTHORIZATION, bearer(token)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get("/api/dashboard/team").header(HttpHeaders.AUTHORIZATION, bearer(token)))
        .andExpect(status().isForbidden());
  }

  private String signup() throws Exception {
    String email = uniqueEmail();
    signupResult(email);
    return email;
  }

  private MvcResult signupResult(String email) throws Exception {
    return mockMvc
        .perform(jsonPost("/api/auth/signup", signupBody(email, PASSWORD)))
        .andExpect(status().isCreated())
        .andReturn();
  }

  private String accessToken(MvcResult result) throws Exception {
    JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    return body.get("accessToken").asText();
  }

  private static Cookie refreshCookie(MvcResult result) {
    Cookie cookie = result.getResponse().getCookie(RefreshCookieFactory.COOKIE_NAME);
    assertThat(cookie).isNotNull();
    return cookie;
  }

  private static Map<String, Object> signupBody(String email, String password) {
    return Map.of(
        "email", email,
        "password", password,
        "fullName", "Test Recruit",
        "jobTitle", "Backend Engineer",
        "department", "Engineering",
        "startDate", "2026-09-21");
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder jsonPost(
      String url, Object body) throws Exception {
    return post(url)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(body));
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder jsonPut(
      String url, Object body) throws Exception {
    return put(url)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(body));
  }

  private static String bearer(String token) {
    return "Bearer " + token;
  }

  private static String uniqueEmail() {
    return "user-" + UUID.randomUUID() + "@example.com";
  }
}
