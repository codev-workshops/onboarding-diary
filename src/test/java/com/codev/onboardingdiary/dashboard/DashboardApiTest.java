package com.codev.onboardingdiary.dashboard;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class DashboardApiTest extends ApiTestSupport {

  private static final String TODAY = LocalDate.now().toString();

  private static Map<String, Object> task(String status) {
    return Map.of(
        "entryDate", TODAY, "title", "Task " + status, "category", "SETUP",
        "status", status, "priority", "LOW");
  }

  private static Map<String, Object> issue(String title, String severity, String status) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", TODAY);
    body.put("title", title);
    body.put("severity", severity);
    body.put("status", status);
    body.put("resolutionNotes", "fixed");
    return body;
  }

  @Test
  void emptyDashboardHasNullPercent() throws Exception {
    getAs(login(createUser(Role.RECRUIT)), "/api/dashboard")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.counts.tasks").value(0))
        .andExpect(jsonPath("$.taskProgress.percent").isEmpty())
        .andExpect(jsonPath("$.taskProgress.byStatus.DONE").value(0))
        .andExpect(jsonPath("$.openIssues.count").value(0))
        .andExpect(jsonPath("$.recent.length()").value(0));
  }

  @Test
  void summarisesProgressOpenIssuesAndRecentEntries() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    postAs(session, "/api/tasks", task("DONE"));
    postAs(session, "/api/tasks", task("DONE"));
    postAs(session, "/api/tasks", task("TODO"));
    postAs(session, "/api/issues", issue("Low one", "LOW", "OPEN"));
    postAs(session, "/api/issues", issue("Critical one", "CRITICAL", "IN_PROGRESS"));
    postAs(session, "/api/issues", issue("Done one", "HIGH", "RESOLVED"));
    postAs(
        session,
        "/api/notes",
        Map.of("entryDate", TODAY, "title", "Latest note", "content", "text"));

    getAs(session, "/api/dashboard")
        .andExpect(jsonPath("$.counts.tasks").value(3))
        .andExpect(jsonPath("$.counts.issues").value(3))
        .andExpect(jsonPath("$.counts.notes").value(1))
        .andExpect(jsonPath("$.taskProgress.done").value(2))
        .andExpect(jsonPath("$.taskProgress.percent").value(66.7))
        .andExpect(jsonPath("$.openIssues.count").value(2))
        .andExpect(jsonPath("$.openIssues.bySeverity.HIGH").value(0))
        .andExpect(jsonPath("$.openIssues.top[0].title").value("Critical one"))
        .andExpect(jsonPath("$.recent.length()").value(7))
        .andExpect(jsonPath("$.recent[0].type").value("NOTE"));
  }
}
