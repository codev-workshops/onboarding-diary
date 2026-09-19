package com.codev.onboardingdiary.web;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.IntegrationTest;
import org.junit.jupiter.api.Test;

class AuthorizationIT extends IntegrationTest {

    @Test
    void anonymousUserIsSentToLogin() throws Exception {
        mockMvc.perform(get("/dashboard").header("Accept", "text/html"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    void recruitCannotReadAnotherRecruitsTask() throws Exception {
        mockMvc.perform(get("/tasks/edit/" + recruitTask.getId()).with(as(otherRecruit)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/tasks/" + recruitTask.getId()).with(as(otherRecruit)))
                .andExpect(status().isForbidden());
    }

    @Test
    void recruitCannotEditOrDeleteAnotherRecruitsTask() throws Exception {
        mockMvc.perform(post("/tasks/edit/" + recruitTask.getId()).with(as(otherRecruit)).with(csrf())
                        .param("date", recruitTask.getDate().toString())
                        .param("title", "Hijacked title")
                        .param("category", "Setup")
                        .param("status", "TODO")
                        .param("priority", "LOW"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/tasks/delete/" + recruitTask.getId()).with(as(otherRecruit)).with(csrf()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tasks/" + recruitTask.getId()).with(as(recruit)))
                .andExpect(status().isOk());
    }

    @Test
    void managerCanOnlySeeOwnTeam() throws Exception {
        mockMvc.perform(get("/manager/recruits/" + recruit.getId()).with(as(manager)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Rita Recruit")));

        mockMvc.perform(get("/manager/recruits/" + otherRecruit.getId()).with(as(manager)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanSeeAnyRecruitAndManagerAreaIsClosedToRecruits() throws Exception {
        mockMvc.perform(get("/manager/recruits/" + otherRecruit.getId()).with(as(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/admin/users").with(as(admin))).andExpect(status().isOk());

        mockMvc.perform(get("/admin/users").with(as(manager))).andExpect(status().isForbidden());
        mockMvc.perform(get("/manager/recruits").with(as(recruit))).andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/users").with(as(recruit))).andExpect(status().isForbidden());
    }

    @Test
    void stateChangingRequestsRequireCsrf() throws Exception {
        mockMvc.perform(post("/tasks/delete/" + recruitTask.getId()).with(as(recruit)))
                .andExpect(status().isForbidden());
    }
}
