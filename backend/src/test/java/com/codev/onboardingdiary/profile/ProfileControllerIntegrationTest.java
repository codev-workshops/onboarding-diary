package com.codev.onboardingdiary.profile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProfileControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  private String bearer;

  @BeforeEach
  void signUp() throws Exception {
    Map<String, Object> body =
        Map.of(
            "email", "profile-" + UUID.randomUUID() + "@example.com",
            "password", "Secret123",
            "fullName", "Pat Profile",
            "department", "Finance",
            "startDate", "2026-09-01");
    String response =
        mockMvc
            .perform(
                post("/api/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body)))
            .andReturn()
            .getResponse()
            .getContentAsString();
    bearer = "Bearer " + objectMapper.readTree(response).get("accessToken").asText();
  }

  @Test
  void getReturnsOwnProfile() throws Exception {
    mockMvc
        .perform(get("/api/profile").header(HttpHeaders.AUTHORIZATION, bearer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.fullName").value("Pat Profile"))
        .andExpect(jsonPath("$.profile.jobTitle").isEmpty())
        .andExpect(jsonPath("$.profile.startDate").value("2026-09-01"));
  }

  @Test
  void updateChangesEditableFields() throws Exception {
    Map<String, Object> update =
        Map.of(
            "fullName", "Pat Updated",
            "jobTitle", "Analyst",
            "department", "Operations",
            "startDate", "2026-09-08");

    mockMvc
        .perform(
            put("/api/profile")
                .header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(update)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profile.fullName").value("Pat Updated"))
        .andExpect(jsonPath("$.profile.jobTitle").value("Analyst"))
        .andExpect(jsonPath("$.profile.department").value("Operations"));
  }

  @Test
  void updateValidatesRequiredFields() throws Exception {
    mockMvc
        .perform(
            put("/api/profile")
                .header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"\",\"department\":\"Ops\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void profileRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
  }
}
