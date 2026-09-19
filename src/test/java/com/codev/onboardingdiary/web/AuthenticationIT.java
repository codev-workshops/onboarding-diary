package com.codev.onboardingdiary.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.unauthenticated;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.support.IntegrationTest;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AuthenticationIT extends IntegrationTest {

    @Test
    void activeUserCanLogIn() throws Exception {
        mockMvc.perform(formLogin("/login").userParameter("email").user(recruit.getEmail())
                        .passwordParam("password").password(PASSWORD))
                .andExpect(authenticated());
    }

    @Test
    void disabledUserCannotLogIn() throws Exception {
        mockMvc.perform(formLogin("/login").userParameter("email").user(disabledRecruit.getEmail())
                        .passwordParam("password").password(PASSWORD))
                .andExpect(unauthenticated());
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mockMvc.perform(formLogin("/login").userParameter("email").user(recruit.getEmail())
                        .passwordParam("password").password("wrong-password"))
                .andExpect(unauthenticated());
    }

    @Test
    void publicSignupAlwaysCreatesRecruitAndHashesPassword() throws Exception {
        mockMvc.perform(post("/signup").with(csrf())
                        .param("name", "Sneaky User")
                        .param("email", "Sneaky@Example.com")
                        .param("password", PASSWORD)
                        .param("department", "Engineering")
                        .param("startDate", LocalDate.now().minusDays(1).toString())
                        .param("role", "ADMIN"))
                .andExpect(status().is3xxRedirection());

        User created = userRepository.findByEmailIgnoreCase("sneaky@example.com").orElseThrow();
        assertThat(created.getRole()).isEqualTo(Role.RECRUIT);
        assertThat(created.getPasswordHash()).isNotEqualTo(PASSWORD).startsWith("$2");
    }

    @Test
    void signupRejectsDuplicateEmailCaseInsensitively() throws Exception {
        mockMvc.perform(post("/signup").with(csrf())
                        .param("name", "Copy Cat")
                        .param("email", recruit.getEmail().toUpperCase())
                        .param("password", PASSWORD)
                        .param("startDate", LocalDate.now().minusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(model().attributeHasFieldErrors("signupForm", "email"));
    }

    @Test
    void signupRejectsInvalidEmailAndShortPassword() throws Exception {
        mockMvc.perform(post("/signup").with(csrf())
                        .param("name", "X")
                        .param("email", "not-an-email")
                        .param("password", "short"))
                .andExpect(status().isOk())
                .andExpect(model().attributeHasFieldErrors("signupForm", "name", "email", "password"));
    }
}
