package com.codev.onboardingdiary.web;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.IntegrationTest;
import java.time.LocalDate;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ApiIT extends IntegrationTest {

    @Test
    void meEndpointReturnsSafeProfileWithoutPasswordHash() throws Exception {
        mockMvc.perform(get("/api/me").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(recruit.getEmail()))
                .andExpect(jsonPath("$.role").value("RECRUIT"))
                .andExpect(jsonPath("$.managerName").value("Mia Manager"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(content().string(Matchers.not(Matchers.containsString("$2a$"))));
    }

    @Test
    void dashboardEndpointReturnsAnalytics() throws Exception {
        mockMvc.perform(get("/api/dashboard").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(3))
                .andExpect(jsonPath("$.completedTasks").value(1))
                .andExpect(jsonPath("$.completionPercentage").value(33))
                .andExpect(jsonPath("$.openIssues").value(1));
    }

    @Test
    void listEndpointsAreScopedToTheCaller() throws Exception {
        mockMvc.perform(get("/api/tasks").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(content().string(Matchers.not(Matchers.containsString("Other recruit task"))));
        mockMvc.perform(get("/api/issues").with(as(recruit))).andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/feedback").with(as(recruit))).andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/notes").with(as(recruit))).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void taskApiSupportsFullCrud() throws Exception {
        String created = mockMvc.perform(post("/api/tasks").with(as(recruit)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","title":"API created task","description":"via api",
                                 "category":"Setup","status":"TODO","priority":"MEDIUM"}
                                """.formatted(LocalDate.now())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("API created task"))
                .andReturn().getResponse().getContentAsString();
        long id = com.jayway.jsonpath.JsonPath.parse(created).read("$.id", Integer.class);

        mockMvc.perform(put("/api/tasks/" + id).with(as(recruit)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","title":"API updated task","description":"via api",
                                 "category":"Setup","status":"COMPLETED","priority":"MEDIUM"}
                                """.formatted(LocalDate.now())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(get("/api/tasks/" + id).with(as(recruit)))
                .andExpect(jsonPath("$.title").value("API updated task"));

        mockMvc.perform(delete("/api/tasks/" + id).with(as(recruit)).with(csrf()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/tasks/" + id).with(as(recruit)))
                .andExpect(status().isNotFound());
    }

    @Test
    void apiValidationErrorsAreReportedPerField() throws Exception {
        mockMvc.perform(post("/api/tasks").with(as(recruit)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","title":"ab","category":"","status":"TODO","priority":"MEDIUM"}
                                """.formatted(LocalDate.now().plusDays(2))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors.date").exists())
                .andExpect(jsonPath("$.fieldErrors.title").exists())
                .andExpect(jsonPath("$.fieldErrors.category").exists());
    }

    @Test
    void malformedBodyIsRejected() throws Exception {
        mockMvc.perform(post("/api/tasks").with(as(recruit)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"NOT_A_STATUS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body"));
    }

    @Test
    void apiRejectsCrossUserMutation() throws Exception {
        mockMvc.perform(put("/api/tasks/" + recruitTask.getId()).with(as(otherRecruit)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"date":"%s","title":"Hijack attempt","category":"Setup",
                                 "status":"TODO","priority":"LOW"}
                                """.formatted(LocalDate.now())))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/tasks/" + recruitTask.getId()).with(as(otherRecruit)).with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    void searchApiReturnsEveryCategory() throws Exception {
        mockMvc.perform(get("/api/search").param("q", "VPN").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.category == 'TASK')]").exists())
                .andExpect(jsonPath("$[?(@.category == 'ISSUE')]").exists())
                .andExpect(jsonPath("$[?(@.category == 'FEEDBACK')]").exists())
                .andExpect(jsonPath("$[?(@.category == 'NOTE')]").exists());
    }

    @Test
    void apiRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/tasks")).andExpect(status().isUnauthorized());
    }
}
