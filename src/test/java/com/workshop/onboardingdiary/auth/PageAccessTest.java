package com.workshop.onboardingdiary.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
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
    void everyPageOfThePhase7NavigationRendersForARecruit() throws Exception {
        User user = testUsers.create("nav@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        String token = jwtService.issueToken(user.getEmail(), user.getRole());

        for (String path : new String[] {"/dashboard", "/tasks", "/issues", "/feedback", "/notes", "/reports"}) {
            mockMvc.perform(get(path).accept(MediaType.TEXT_HTML).cookie(new Cookie("ACCESS_TOKEN", token)))
                    .andExpect(status().isOk())
                    .andExpect(view().name(path.substring(1)))
                    .andExpect(content().string(org.hamcrest.Matchers.containsString("Task Log")))
                    .andExpect(content().string(org.hamcrest.Matchers.not(
                            org.hamcrest.Matchers.containsString("/admin/"))));
        }
    }

    @Test
    void theSearchPageRendersAndTheNavCarriesTheSearchBar() throws Exception {
        User user = testUsers.create("search-page@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        String token = jwtService.issueToken(user.getEmail(), user.getRole());

        mockMvc.perform(get("/dashboard").accept(MediaType.TEXT_HTML).cookie(new Cookie("ACCESS_TOKEN", token)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("id=\"nav-search-q\"")));

        mockMvc.perform(get("/search?q=onboarding").accept(MediaType.TEXT_HTML)
                        .cookie(new Cookie("ACCESS_TOKEN", token)))
                .andExpect(status().isOk())
                .andExpect(view().name("search"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("value=\"onboarding\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Feedback Notes")))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("nav-search-userId"))));
    }

    @Test
    void theTeamDashboardLinkAndPageAreManagerAndAdminOnly() throws Exception {
        User recruit = testUsers.create("md-nav-recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        String recruitToken = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
        mockMvc.perform(get("/dashboard").accept(MediaType.TEXT_HTML)
                        .cookie(new Cookie("ACCESS_TOKEN", recruitToken)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("/manager-dashboard"))));

        User manager = testUsers.create("md-nav-manager@example.com", "sup3rsecret", Role.MANAGER, true);
        String managerToken = jwtService.issueToken(manager.getEmail(), manager.getRole());
        mockMvc.perform(get("/dashboard").accept(MediaType.TEXT_HTML)
                        .cookie(new Cookie("ACCESS_TOKEN", managerToken)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("/manager-dashboard")));

        mockMvc.perform(get("/manager-dashboard").accept(MediaType.TEXT_HTML)
                        .cookie(new Cookie("ACCESS_TOKEN", managerToken)))
                .andExpect(status().isOk())
                .andExpect(view().name("manager-dashboard"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Team Dashboard")));
    }

    @Test
    void homeRedirectsToTheDashboard() throws Exception {
        User user = testUsers.create("home@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        String token = jwtService.issueToken(user.getEmail(), user.getRole());

        mockMvc.perform(get("/").accept(MediaType.TEXT_HTML).cookie(new Cookie("ACCESS_TOKEN", token)))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/dashboard"));
    }

    @Test
    void feedbackPageIsReadOnlyForManagers() throws Exception {
        User manager = testUsers.create("manager-page@example.com", "sup3rsecret", Role.MANAGER, true);
        String token = jwtService.issueToken(manager.getEmail(), manager.getRole());

        mockMvc.perform(get("/feedback").accept(MediaType.TEXT_HTML).cookie(new Cookie("ACCESS_TOKEN", token)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString(
                        "Feedback notes are read-only for your role")))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("id=\"new-feedback\""))));
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
