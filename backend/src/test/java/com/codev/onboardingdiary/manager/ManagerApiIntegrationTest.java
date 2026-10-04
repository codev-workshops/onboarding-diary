package com.codev.onboardingdiary.manager;

import static com.codev.onboardingdiary.support.DiaryFixtures.issue;
import static com.codev.onboardingdiary.support.DiaryFixtures.note;
import static com.codev.onboardingdiary.support.DiaryFixtures.task;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ManagerApiIntegrationTest extends ApiTestSupport {

  private String admin;
  private String manager;
  private long managerId;
  private String recruit;
  private long recruitId;
  private long otherRecruitId;

  @BeforeEach
  void setUp() throws Exception {
    admin = adminToken();
    String managerEmail = randomEmail("manager");
    managerId = createUser(admin, managerEmail, Role.MANAGER);
    manager = login(managerEmail, TEMP_PASSWORD);
    recruit = signupRecruit();
    recruitId = userId(recruit);
    otherRecruitId = userId(signupRecruit());
    putJson(admin, "/api/admin/users/" + recruitId + "/manager", Map.of("managerId", managerId))
        .andExpect(status().isOk());
  }

  @Test
  void managerListsOnlyAssignedRecruitsWithProgress() throws Exception {
    postJson(recruit, "/api/tasks", task("Done", "COMPLETED", TODAY));
    postJson(recruit, "/api/tasks", task("Todo", "TODO", TODAY));
    postJson(recruit, "/api/issues", issue("Blocked", "CRITICAL", TODAY));

    getJson(manager, "/api/manager/recruits")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].id").value(recruitId))
        .andExpect(jsonPath("$[0].completionPct").value(50.0))
        .andExpect(jsonPath("$[0].openIssues").value(1))
        .andExpect(jsonPath("$[0].highSeverityOpenIssues").value(1))
        .andExpect(jsonPath("$[0].atRisk").value(true))
        .andExpect(jsonPath("$[0].inactive").value(false));
  }

  @Test
  void managerCannotViewUnassignedRecruit() throws Exception {
    for (String path : new String[] {"", "/dashboard", "/recent", "/tasks", "/issues", "/notes"}) {
      getJson(manager, "/api/manager/recruits/" + otherRecruitId + path)
          .andExpect(status().isForbidden());
    }
    getJson(manager, "/api/manager/recruits/999999").andExpect(status().isForbidden());
  }

  @Test
  void managerReadsRecruitLogsButOnlySharedNotes() throws Exception {
    postJson(recruit, "/api/tasks", task("Laptop", "TODO", TODAY));
    postJson(recruit, "/api/notes", note("Shared note", true, TODAY));
    postJson(recruit, "/api/notes", note("Private note", false, TODAY));
    String base = "/api/manager/recruits/" + recruitId;

    getJson(manager, base + "/tasks")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].title").value("Laptop"));
    getJson(manager, base + "/notes")
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].title").value("Shared note"));
    getJson(manager, base + "/dashboard").andExpect(jsonPath("$.notes.total").value(1));
    getJson(manager, base + "/recent?limit=10").andExpect(jsonPath("$", hasSize(2)));
    getJson(recruit, "/api/dashboard/summary").andExpect(jsonPath("$.notes.total").value(2));
  }

  @Test
  void teamDashboardListsUrgentIssues() throws Exception {
    postJson(recruit, "/api/issues", issue("No VPN", "HIGH", TODAY));
    postJson(recruit, "/api/issues", issue("Minor", "LOW", TODAY));

    getJson(manager, "/api/dashboard/team")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recruitCount").value(1))
        .andExpect(jsonPath("$.openIssues").value(2))
        .andExpect(jsonPath("$.atRiskCount").value(1))
        .andExpect(jsonPath("$.weeklyCompletedTrend", hasSize(8)))
        .andExpect(jsonPath("$.highSeverityIssues", hasSize(1)))
        .andExpect(jsonPath("$.highSeverityIssues[0].issue.title").value("No VPN"))
        .andExpect(jsonPath("$.highSeverityIssues[0].recruitId").value(recruitId));
  }

  @Test
  void adminCanViewAnyRecruit() throws Exception {
    getJson(admin, "/api/manager/recruits/" + otherRecruitId).andExpect(status().isOk());
    getJson(admin, "/api/manager/recruits/999999").andExpect(status().isNotFound());
  }

  @Test
  void recruitsCannotUseManagerEndpoints() throws Exception {
    getJson(recruit, "/api/manager/recruits").andExpect(status().isForbidden());
    getJson(recruit, "/api/dashboard/team").andExpect(status().isForbidden());
  }

  @Test
  void managerViewsAreReadOnly() throws Exception {
    postJson(manager, "/api/manager/recruits/" + recruitId + "/tasks", task("X", "TODO", TODAY))
        .andExpect(status().isMethodNotAllowed());
  }
}
