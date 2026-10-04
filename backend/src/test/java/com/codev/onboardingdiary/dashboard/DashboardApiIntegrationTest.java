package com.codev.onboardingdiary.dashboard;

import static com.codev.onboardingdiary.support.DiaryFixtures.feedback;
import static com.codev.onboardingdiary.support.DiaryFixtures.issue;
import static com.codev.onboardingdiary.support.DiaryFixtures.note;
import static com.codev.onboardingdiary.support.DiaryFixtures.task;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardApiIntegrationTest extends ApiTestSupport {

  @Test
  void summaryOfNewRecruitIsAllZeros() throws Exception {
    String token = signupRecruit();

    getJson(token, "/api/dashboard/summary")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.daysSinceStart").value(10))
        .andExpect(jsonPath("$.tasks.total").value(0))
        .andExpect(jsonPath("$.tasks.completionPct").value(0.0))
        .andExpect(jsonPath("$.tasks.byStatus.BLOCKED").value(0))
        .andExpect(jsonPath("$.issues.open").value(0))
        .andExpect(jsonPath("$.weeklyCompletedTrend", hasSize(8)))
        .andExpect(jsonPath("$.topOpenIssues", hasSize(0)));
  }

  @Test
  void summaryCountsEntriesAcrossAllLogs() throws Exception {
    String token = signupRecruit();
    postJson(token, "/api/tasks", task("Laptop", "COMPLETED", TODAY));
    postJson(token, "/api/tasks", task("Accounts", "COMPLETED", TODAY));
    postJson(token, "/api/tasks", task("Read docs", "TODO", TODAY));
    postJson(token, "/api/issues", issue("Old low issue", "LOW", TODAY.minusDays(3)));
    postJson(token, "/api/issues", issue("Medium issue", "MEDIUM", TODAY));
    long critical = createdId(postJson(token, "/api/issues", issue("No VPN", "CRITICAL", TODAY)));
    long resolved = createdId(postJson(token, "/api/issues", issue("Fixed", "HIGH", TODAY)));
    patchJson(
        token,
        "/api/issues/" + resolved + "/status",
        Map.of("status", "RESOLVED", "resolutionNotes", "Done"));
    postJson(token, "/api/feedback", feedback("Great buddy", "POSITIVE", TODAY));
    postJson(token, "/api/feedback", feedback("More docs", "SUGGESTION", TODAY));
    postJson(token, "/api/notes", note("Private", false, TODAY));

    JsonNode summary = body(getJson(token, "/api/dashboard/summary").andExpect(status().isOk()));

    assertThat(summary.at("/tasks/total").asLong()).isEqualTo(3);
    assertThat(summary.at("/tasks/byStatus/COMPLETED").asLong()).isEqualTo(2);
    assertThat(summary.at("/tasks/completionPct").asDouble()).isEqualTo(66.7);
    assertThat(summary.at("/issues/open").asLong()).isEqualTo(3);
    assertThat(summary.at("/issues/openBySeverity/HIGH").asLong()).isZero();
    assertThat(summary.at("/issues/openBySeverity/CRITICAL").asLong()).isEqualTo(1);
    assertThat(summary.at("/feedback/total").asLong()).isEqualTo(2);
    assertThat(summary.at("/feedback/byType/CONCERN").asLong()).isZero();
    assertThat(summary.at("/notes/total").asLong()).isEqualTo(1);
    assertThat(summary.at("/weeklyCompletedTrend/7/completed").asLong()).isEqualTo(2);
    assertThat(summary.at("/topOpenIssues/0/id").asLong()).isEqualTo(critical);
    assertThat(summary.at("/topOpenIssues/2/title").asText()).isEqualTo("Old low issue");
  }

  @Test
  void summaryOnlyCountsOwnEntries() throws Exception {
    String owner = signupRecruit();
    String other = signupRecruit();
    postJson(owner, "/api/tasks", task("Mine", "TODO", TODAY));

    getJson(other, "/api/dashboard/summary").andExpect(jsonPath("$.tasks.total").value(0));
  }

  @Test
  void recentMergesLogsNewestFirstAndHonoursLimit() throws Exception {
    String token = signupRecruit();
    postJson(token, "/api/tasks", task("First", "TODO", TODAY));
    postJson(token, "/api/issues", issue("Second", "LOW", TODAY));
    postJson(token, "/api/feedback", feedback("Third", "CONCERN", TODAY));
    postJson(token, "/api/notes", note("Fourth", false, TODAY));

    getJson(token, "/api/dashboard/recent?limit=3")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(3)))
        .andExpect(jsonPath("$[0].type").value("NOTE"))
        .andExpect(jsonPath("$[0].title").value("Fourth"))
        .andExpect(jsonPath("$[1].type").value("FEEDBACK"))
        .andExpect(jsonPath("$[1].status").value("CONCERN"))
        .andExpect(jsonPath("$[2].type").value("ISSUE"));
  }

  @Test
  void dashboardRequiresAuthentication() throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(
                "/api/dashboard/summary"))
        .andExpect(status().isUnauthorized());
  }
}
