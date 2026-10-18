package com.codev.onboardingdiary.team;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class TeamDashboardApiTest extends ApiTestSupport {

  @Test
  void aggregatesOnlyTheManagersTeam() throws Exception {
    User manager = createUser(Role.MANAGER);
    User busy = createUser(Role.RECRUIT, manager);
    createUser(Role.RECRUIT, manager);
    User outsider = createUser(Role.RECRUIT);
    String today = LocalDate.now().toString();
    MockHttpSession busySession = login(busy);
    postAs(busySession, "/api/issues", Map.of("entryDate", today, "title", "Payroll",
        "severity", "CRITICAL", "status", "OPEN"));
    postAs(busySession, "/api/tasks", Map.of("entryDate", today, "title", "Badge",
        "category", "SETUP", "status", "DONE", "priority", "LOW"));
    postAs(busySession, "/api/feedback", Map.of("entryDate", today, "subject", "Schedule",
        "type", "CONCERN", "details", "Unclear"));
    postAs(login(outsider), "/api/issues", Map.of("entryDate", today, "title", "Other",
        "severity", "HIGH", "status", "OPEN"));

    getAs(login(manager), "/api/team-dashboard")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recruitCount").value(2))
        .andExpect(jsonPath("$.openIssues").value(1))
        .andExpect(jsonPath("$.openBySeverity.CRITICAL").value(1))
        .andExpect(jsonPath("$.openBySeverity.HIGH").value(0))
        .andExpect(jsonPath("$.recruits[0].percent").isEmpty())
        .andExpect(jsonPath("$.recruits[1].criticalIssues").value(1))
        .andExpect(jsonPath("$.recentConcerns[0].subject").value("Schedule"));
    getAs(busySession, "/api/team-dashboard").andExpect(status().isForbidden());
  }
}
