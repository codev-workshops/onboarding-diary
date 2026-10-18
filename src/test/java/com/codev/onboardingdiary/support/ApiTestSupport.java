package com.codev.onboardingdiary.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Base class for API integration tests: real security filter chain and session login. */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class ApiTestSupport {

  public static final String PASSWORD = "Passw0rd!";

  @Autowired protected MockMvc mvc;
  @Autowired protected ObjectMapper objectMapper;
  @Autowired protected UserRepository userRepository;
  @Autowired protected PasswordEncoder passwordEncoder;

  protected User createUser(Role role) {
    return createUser(role, null);
  }

  protected User createUser(Role role, User manager) {
    String email = role.name().toLowerCase() + "-" + UUID.randomUUID() + "@test.local";
    User user = new User(email, passwordEncoder.encode(PASSWORD), "Test " + role.name(), role);
    user.setDepartment("Engineering");
    if (role == Role.RECRUIT) {
      user.setStartDate(LocalDate.now().minusDays(7));
      user.setManager(manager);
    }
    return userRepository.save(user);
  }

  protected MockHttpSession login(User user) throws Exception {
    MockHttpSession session = new MockHttpSession();
    mvc.perform(
            post("/api/auth/login")
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("email", user.getEmail(), "password", PASSWORD))))
        .andExpect(status().isOk());
    return session;
  }

  protected ResultActions getAs(MockHttpSession session, String url) throws Exception {
    return mvc.perform(get(url).session(session));
  }

  protected ResultActions postAs(MockHttpSession session, String url, Object body)
      throws Exception {
    return mvc.perform(
        post(url)
            .session(session)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(body)));
  }

  protected ResultActions putAs(MockHttpSession session, String url, Object body)
      throws Exception {
    return mvc.perform(
        put(url)
            .session(session)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(body)));
  }

  protected ResultActions deleteAs(MockHttpSession session, String url) throws Exception {
    return mvc.perform(delete(url).session(session).with(csrf()));
  }

  protected String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }

  protected JsonNode body(ResultActions result) throws Exception {
    return objectMapper.readTree(result.andReturn().getResponse().getContentAsString());
  }
}
