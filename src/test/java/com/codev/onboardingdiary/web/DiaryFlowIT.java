package com.codev.onboardingdiary.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.TaskStatus;
import com.codev.onboardingdiary.support.IntegrationTest;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class DiaryFlowIT extends IntegrationTest {

    @Test
    void recruitSeesOnlyOwnEntriesOnEveryListPage() throws Exception {
        mockMvc.perform(get("/tasks").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(view().name("tasks/list"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Set up VPN access")))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("Other recruit task"))));

        mockMvc.perform(get("/issues").with(as(recruit))).andExpect(status().isOk());
        mockMvc.perform(get("/feedback").with(as(recruit))).andExpect(status().isOk());
        mockMvc.perform(get("/notes").with(as(recruit))).andExpect(status().isOk());
        mockMvc.perform(get("/profile").with(as(recruit))).andExpect(status().isOk());
    }

    @Test
    void taskCreateUpdateDeleteRoundTrip() throws Exception {
        mockMvc.perform(post("/tasks").with(as(recruit)).with(csrf())
                        .param("date", LocalDate.now().toString())
                        .param("title", "Attend security training")
                        .param("description", "Mandatory module")
                        .param("category", "Compliance")
                        .param("status", "TODO")
                        .param("priority", "HIGH"))
                .andExpect(redirectedUrl("/tasks"));

        Task created = taskRepository.findAll().stream()
                .filter(t -> t.getTitle().equals("Attend security training")).findFirst().orElseThrow();
        assertThat(created.getUser().getId()).isEqualTo(recruit.getId());

        mockMvc.perform(post("/tasks/edit/" + created.getId()).with(as(recruit)).with(csrf())
                        .param("date", LocalDate.now().toString())
                        .param("title", "Attend security training")
                        .param("description", "Completed module")
                        .param("category", "Compliance")
                        .param("status", "COMPLETED")
                        .param("priority", "HIGH"))
                .andExpect(redirectedUrl("/tasks"));
        assertThat(taskRepository.findById(created.getId()).orElseThrow().getStatus())
                .isEqualTo(TaskStatus.COMPLETED);

        mockMvc.perform(post("/tasks/delete/" + created.getId()).with(as(recruit)).with(csrf()))
                .andExpect(redirectedUrl("/tasks"));
        assertThat(taskRepository.findById(created.getId())).isEmpty();
    }

    @Test
    void invalidTaskIsRejectedServerSideAndNotPersisted() throws Exception {
        long before = taskRepository.count();
        mockMvc.perform(post("/tasks").with(as(recruit)).with(csrf())
                        .param("date", LocalDate.now().plusDays(3).toString())
                        .param("title", "ab")
                        .param("description", "x".repeat(4001))
                        .param("category", "")
                        .param("status", "TODO")
                        .param("priority", "HIGH"))
                .andExpect(status().isOk())
                .andExpect(view().name("tasks/form"))
                .andExpect(model().attributeHasFieldErrors("taskForm", "date", "title", "description", "category"));
        assertThat(taskRepository.count()).isEqualTo(before);
    }

    @Test
    void issuesFeedbackAndNotesCanBeCreated() throws Exception {
        mockMvc.perform(post("/issues").with(as(recruit)).with(csrf())
                        .param("date", LocalDate.now().toString())
                        .param("title", "Monitor cable missing")
                        .param("description", "No HDMI cable at the desk")
                        .param("severity", "LOW")
                        .param("status", "OPEN"))
                .andExpect(redirectedUrl("/issues"));

        mockMvc.perform(post("/feedback").with(as(recruit)).with(csrf())
                        .param("date", LocalDate.now().toString())
                        .param("subject", "Induction day was clear")
                        .param("type", "POSITIVE")
                        .param("details", "Very well organised"))
                .andExpect(redirectedUrl("/feedback"));

        mockMvc.perform(post("/notes").with(as(recruit)).with(csrf())
                        .param("date", LocalDate.now().toString())
                        .param("title", "Standup times")
                        .param("content", "Daily standup at 09:30")
                        .param("tags", "process"))
                .andExpect(redirectedUrl("/notes"));

        assertThat(issueRepository.count()).isEqualTo(3);
        assertThat(feedbackRepository.count()).isEqualTo(2);
        assertThat(noteRepository.count()).isEqualTo(2);
    }

    @Test
    void crossCategorySearchMatchesEveryCategoryAndStaysScoped() throws Exception {
        mockMvc.perform(get("/search").param("q", "VPN").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Set up VPN access")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("VPN certificate rejected")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Buddy system is great")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Week one notes")));

        mockMvc.perform(get("/search").param("q", "Other recruit task").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("No entries matched")));
    }

    @Test
    void deleteConfirmationUsesAListenerRatherThanAnInlineHandler() throws Exception {
        for (String path : new String[] {"/tasks", "/issues", "/feedback", "/notes"}) {
            String html = mockMvc.perform(get(path).with(as(recruit)))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();

            assertThat(html).contains("data-confirm=").contains("/js/app.js");
            assertThat(html).doesNotContain("onsubmit=").doesNotContain("onclick=");
        }
    }

    @Test
    void dashboardShipsChartDataInAnAttributeSoTheStrictCspAllowsIt() throws Exception {
        String html = mockMvc.perform(get("/dashboard").with(as(recruit)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(html).contains("id=\"chartData\"").contains("tasksByStatus").contains("issuesBySeverity");
        assertThat(html).doesNotContain("window.dashboardCharts");
        assertThat(html).contains("data-progress=\"33\"");
    }

    @Test
    void dashboardShowsCompletionAndOpenIssueCounts() throws Exception {
        mockMvc.perform(get("/dashboard").with(as(recruit)))
                .andExpect(status().isOk())
                .andExpect(model().attributeExists("dashboard"))
                .andExpect(result -> {
                    var dashboard = (com.codev.onboardingdiary.web.dto.DashboardDto)
                            result.getModelAndView().getModel().get("dashboard");
                    assertThat(dashboard.totalTasks()).isEqualTo(3);
                    assertThat(dashboard.completedTasks()).isEqualTo(1);
                    assertThat(dashboard.completionPercentage()).isEqualTo(33);
                    assertThat(dashboard.openIssues()).isEqualTo(1);
                    assertThat(dashboard.overdueTasks()).isEqualTo(1);
                    assertThat(dashboard.tasksByStatus()).containsEntry("COMPLETED", 1L);
                    assertThat(dashboard.issuesBySeverity()).containsEntry("HIGH", 1L);
                    assertThat(List.copyOf(dashboard.recentEntries())).isNotEmpty();
                });
    }

    @Test
    void profileUpdateAndPasswordChangeWork() throws Exception {
        mockMvc.perform(post("/profile").with(as(recruit)).with(csrf())
                        .param("name", "Rita R. Recruit")
                        .param("department", "Platform")
                        .param("startDate", LocalDate.now().minusMonths(2).toString()))
                .andExpect(redirectedUrl("/profile"));
        assertThat(userRepository.findById(recruit.getId()).orElseThrow().getName()).isEqualTo("Rita R. Recruit");

        mockMvc.perform(post("/profile/password").with(as(recruit)).with(csrf())
                        .param("currentPassword", PASSWORD)
                        .param("newPassword", "BrandNewPass1!"))
                .andExpect(status().is3xxRedirection());
        assertThat(passwordEncoder.matches("BrandNewPass1!",
                userRepository.findById(recruit.getId()).orElseThrow().getPasswordHash())).isTrue();
    }
}
