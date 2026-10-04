package com.codev.onboardingdiary.report;

import static com.codev.onboardingdiary.support.DiaryFixtures.feedback;
import static com.codev.onboardingdiary.support.DiaryFixtures.issue;
import static com.codev.onboardingdiary.support.DiaryFixtures.note;
import static com.codev.onboardingdiary.support.DiaryFixtures.task;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportApiIntegrationTest extends ApiTestSupport {

  private String recruit;
  private long recruitId;
  private String range;

  @BeforeEach
  void setUp() throws Exception {
    recruit = signupRecruit();
    recruitId = userId(recruit);
    range = "&from=" + START_DATE + "&to=" + TODAY;
  }

  @Test
  void taskCsvHasBomHeaderAndSafeCells() throws Exception {
    postJson(recruit, "/api/tasks", task("=HYPERLINK(\"x\")", "COMPLETED", TODAY));
    postJson(recruit, "/api/tasks", task("Read, then \"sign\"", "TODO", TODAY.minusDays(1)));

    byte[] body =
        getJson(recruit, "/api/reports/download?type=TASKS&format=CSV" + range)
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", containsString("text/csv")))
            .andExpect(
                header()
                    .string(
                        "Content-Disposition",
                        containsString("onboarding-report_test-recruit_tasks_")))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();

    String csv = new String(body, StandardCharsets.UTF_8);
    assertThat(csv).startsWith("\uFEFFdate,title,description,category,status,priority,completedAt");
    String[] lines = csv.split("\r\n");
    assertThat(lines).hasSize(3);
    assertThat(lines[1]).contains("\"Read, then \"\"sign\"\"\"");
    assertThat(lines[2]).contains("\"'=HYPERLINK(\"\"x\"\")\"");
  }

  @Test
  void combinedCsvHasRecordTypeAndExcludesNotes() throws Exception {
    postJson(recruit, "/api/tasks", task("Laptop", "TODO", TODAY));
    postJson(recruit, "/api/issues", issue("VPN", "HIGH", TODAY));
    postJson(recruit, "/api/feedback", feedback("Great buddy", "POSITIVE", TODAY));
    postJson(recruit, "/api/notes", note("Secret note", true, TODAY));

    String csv =
        getJson(recruit, "/api/reports/download?type=COMBINED&format=CSV" + range)
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);

    assertThat(csv).contains("date,recordType,title,description,category,status,priority");
    assertThat(csv).contains(",TASK,Laptop,").contains(",ISSUE,VPN,").contains(",FEEDBACK,Great");
    assertThat(csv).doesNotContain("Secret note");
  }

  @Test
  void pdfDownloadIsAudited() throws Exception {
    postJson(recruit, "/api/tasks", task("Laptop", "COMPLETED", TODAY));

    byte[] pdf =
        getJson(recruit, "/api/reports/download?type=COMBINED&format=PDF" + range)
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andReturn()
            .getResponse()
            .getContentAsByteArray();

    assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    getJson(adminToken(), "/api/admin/audit-log?action=REPORT_GENERATED&userId=" + recruitId)
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].details", containsString("\"format\":\"PDF\"")));
  }

  @Test
  void previewReturnsCountsAndRowsOnlyInRange() throws Exception {
    postJson(recruit, "/api/tasks", task("In range", "TODO", TODAY));
    postJson(recruit, "/api/tasks", task("Too old", "TODO", START_DATE.minusDays(5)));
    postJson(recruit, "/api/issues", issue("VPN", "HIGH", TODAY));

    getJson(recruit, "/api/reports/preview?type=COMBINED" + range)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.counts.TASK").value(1))
        .andExpect(jsonPath("$.counts.ISSUE").value(1))
        .andExpect(jsonPath("$.counts.FEEDBACK").value(0))
        .andExpect(jsonPath("$.totalRows").value(2))
        .andExpect(jsonPath("$.columns[1].key").value("recordType"))
        .andExpect(jsonPath("$.rows", hasSize(2)));
  }

  @Test
  void rejectsInvalidRanges() throws Exception {
    getJson(recruit, "/api/reports/preview?type=TASKS&from=" + TODAY + "&to=" + START_DATE)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("from"));
    getJson(
            recruit,
            "/api/reports/download?type=TASKS&format=CSV&from="
                + TODAY.minusDays(400)
                + "&to="
                + TODAY)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("to"));
    getJson(recruit, "/api/reports/download?format=CSV" + range).andExpect(status().isBadRequest());
    getJson(recruit, "/api/reports/download?type=TASKS&format=XLS" + range)
        .andExpect(status().isBadRequest());
  }

  @Test
  void recruitsCanOnlyReportOnThemselves() throws Exception {
    long other = userId(signupRecruit());
    getJson(recruit, "/api/reports/preview?type=TASKS&userId=" + other + range)
        .andExpect(status().isForbidden());
    getJson(recruit, "/api/reports/preview?type=TASKS&scope=TEAM" + range)
        .andExpect(status().isForbidden());
    getJson(recruit, "/api/reports/preview?type=TASKS&scope=ALL" + range)
        .andExpect(status().isForbidden());
  }

  @Test
  void managersReportOnAssignedRecruitsAndTeam() throws Exception {
    String admin = adminToken();
    String managerEmail = randomEmail("mgr");
    long managerId = createUser(admin, managerEmail, Role.MANAGER);
    String manager = login(managerEmail, TEMP_PASSWORD);
    putJson(admin, "/api/admin/users/" + recruitId + "/manager", Map.of("managerId", managerId));
    long unassigned = userId(signupRecruit());
    postJson(recruit, "/api/tasks", task("Laptop", "TODO", TODAY));

    getJson(manager, "/api/reports/preview?type=TASKS&userId=" + recruitId + range)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalRows").value(1));
    getJson(manager, "/api/reports/preview?type=TASKS&userId=" + unassigned + range)
        .andExpect(status().isForbidden());
    getJson(manager, "/api/reports/preview?type=TASKS&scope=ALL" + range)
        .andExpect(status().isForbidden());

    String csv =
        getJson(manager, "/api/reports/download?type=TASKS&format=CSV&scope=TEAM" + range)
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", containsString("_team_tasks_")))
            .andReturn()
            .getResponse()
            .getContentAsString(StandardCharsets.UTF_8);
    assertThat(csv).startsWith("\uFEFFrecruitName,recruitEmail,date,title");
    assertThat(csv.split("\r\n")).hasSize(2);
  }

  @Test
  void adminsCanReportOrgWide() throws Exception {
    postJson(recruit, "/api/feedback", feedback("Org wide", "CONCERN", TODAY));
    getJson(adminToken(), "/api/reports/download?type=FEEDBACK&format=PDF&scope=ALL" + range)
        .andExpect(status().isOk());
    getJson(adminToken(), "/api/reports/preview?type=FEEDBACK&scope=ALL" + range)
        .andExpect(jsonPath("$.columns[0].key").value("recruitName"));
  }
}
