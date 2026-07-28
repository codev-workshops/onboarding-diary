package com.workshop.onboardingdiary.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestUsers;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Thymeleaf page access rules (REQUIREMENTS 5.1). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PageAccessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Test
    void loginAndSignupPagesArePublic() throws Exception {
        mockMvc.perform(get("/login").accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk())
                .andExpect(view().name("login"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Log in")));

        mockMvc.perform(get("/signup").accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk())
                .andExpect(view().name("signup"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Engineering")));
    }

    @Test
    void unauthenticatedPageAccessRedirectsToLogin() throws Exception {
        mockMvc.perform(get("/profile").accept(MediaType.TEXT_HTML))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    void authenticatedProfilePageRendersTheUsersDetails() throws Exception {
        User user = testUsers.create("page@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        String token = jwtService.issueToken(user.getEmail(), user.getRole());

        mockMvc.perform(get("/profile").accept(MediaType.TEXT_HTML).cookie(new Cookie("ACCESS_TOKEN", token)))
                .andExpect(status().isOk())
                .andExpect(view().name("profile"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("page@example.com")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("NEW_RECRUIT")));
    }
}
