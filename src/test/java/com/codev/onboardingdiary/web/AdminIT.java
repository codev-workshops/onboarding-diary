package com.codev.onboardingdiary.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.support.IntegrationTest;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AdminIT extends IntegrationTest {

    @Test
    void adminCanCreateAManagedRecruit() throws Exception {
        mockMvc.perform(post("/admin/users").with(as(admin)).with(csrf())
                        .param("name", "Nina Newbie")
                        .param("email", "nina@test.local")
                        .param("password", PASSWORD)
                        .param("role", "RECRUIT")
                        .param("department", "Design")
                        .param("startDate", LocalDate.now().toString())
                        .param("managerId", manager.getId().toString()))
                .andExpect(status().is3xxRedirection());

        User created = userRepository.findByEmailIgnoreCase("nina@test.local").orElseThrow();
        assertThat(created.getRole()).isEqualTo(Role.RECRUIT);
        assertThat(created.getManager().getId()).isEqualTo(manager.getId());
        assertThat(created.getPasswordHash()).startsWith("$2");
    }

    @Test
    void duplicateEmailIsRejectedWithFieldError() throws Exception {
        mockMvc.perform(post("/admin/users").with(as(admin)).with(csrf())
                        .param("name", "Clone User")
                        .param("email", recruit.getEmail())
                        .param("password", PASSWORD)
                        .param("role", "RECRUIT")
                        .param("startDate", LocalDate.now().toString()))
                .andExpect(status().isOk())
                .andExpect(model().attributeHasFieldErrors("adminUserForm", "email"));
    }

    @Test
    void adminCanDeactivateAndReassign() throws Exception {
        mockMvc.perform(post("/admin/users/" + recruit.getId() + "/active").with(as(admin)).with(csrf())
                        .param("active", "false"))
                .andExpect(status().is3xxRedirection());
        assertThat(userRepository.findById(recruit.getId()).orElseThrow().isActive()).isFalse();

        mockMvc.perform(post("/admin/users/" + recruit.getId() + "/manager").with(as(admin)).with(csrf())
                        .param("managerId", otherManager.getId().toString()))
                .andExpect(status().is3xxRedirection());
        assertThat(userRepository.findById(recruit.getId()).orElseThrow().getManager().getId())
                .isEqualTo(otherManager.getId());
    }

    @Test
    void nonAdminCannotCreateUsers() throws Exception {
        mockMvc.perform(post("/admin/users").with(as(manager)).with(csrf())
                        .param("name", "Should Fail")
                        .param("email", "fail@test.local")
                        .param("password", PASSWORD)
                        .param("role", "ADMIN")
                        .param("startDate", LocalDate.now().toString()))
                .andExpect(status().isForbidden());
        assertThat(userRepository.findByEmailIgnoreCase("fail@test.local")).isEmpty();
    }
}
