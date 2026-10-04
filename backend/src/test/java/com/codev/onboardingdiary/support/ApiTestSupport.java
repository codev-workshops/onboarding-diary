package com.codev.onboardingdiary.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Signs up throwaway recruits and issues authenticated JSON requests against the API. */
public abstract class ApiTestSupport {

  protected static final LocalDate TODAY = LocalDate.now();
  protected static final LocalDate START_DATE = TODAY.minusDays(10);
  protected static final String ADMIN_EMAIL = "admin@example.com";
  protected static final String ADMIN_PASSWORD = "Admin@12345";
  protected static final String TEMP_PASSWORD = "Temporary1";

  @Autowired protected MockMvc mockMvc;
  @Autowired protected ObjectMapper objectMapper;

  protected String signupRecruit() throws Exception {
    Map<String, Object> body =
        Map.of(
            "email", "user-" + UUID.randomUUID() + "@example.com",
            "password", "Secret123",
            "fullName", "Test Recruit",
            "department", "Engineering",
            "startDate", START_DATE.toString());
    String response =
        mockMvc
            .perform(
                post("/api/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(response).get("accessToken").asText();
  }

  protected String login(String email, String password) throws Exception {
    String response =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", email, "password", password))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(response).get("accessToken").asText();
  }

  protected String adminToken() throws Exception {
    return login(ADMIN_EMAIL, ADMIN_PASSWORD);
  }

  protected long userId(String token) throws Exception {
    return body(getJson(token, "/api/auth/me").andExpect(status().isOk())).get("id").asLong();
  }

  /** Creates a user through the admin API and returns their id. */
  protected long createUser(String adminToken, String email, Role... roles) throws Exception {
    Map<String, Object> body = new HashMap<>();
    body.put("email", email);
    body.put("temporaryPassword", TEMP_PASSWORD);
    body.put("fullName", "User " + email.substring(0, email.indexOf('@')));
    body.put("department", "Engineering");
    body.put("startDate", START_DATE.toString());
    body.put("roles", List.of(roles));
    return createdId(postJson(adminToken, "/api/admin/users", body));
  }

  protected static String randomEmail(String prefix) {
    return prefix + "-" + UUID.randomUUID() + "@example.com";
  }

  protected ResultActions getJson(String token, String url) throws Exception {
    return mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
  }

  protected ResultActions postJson(String token, String url, Object body) throws Exception {
    return mockMvc.perform(
        post(url)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)));
  }

  protected ResultActions putJson(String token, String url, Object body) throws Exception {
    return mockMvc.perform(
        put(url)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)));
  }

  protected ResultActions patchJson(String token, String url, Object body) throws Exception {
    return mockMvc.perform(
        patch(url)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)));
  }

  protected ResultActions deleteJson(String token, String url) throws Exception {
    return mockMvc.perform(delete(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
  }

  protected JsonNode body(ResultActions result) throws Exception {
    return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
  }

  protected long createdId(ResultActions result) throws Exception {
    return body(result.andExpect(status().isCreated())).get("id").asLong();
  }
}
