package com.codev.onboardingdiary.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class ReportApiTest extends ApiTestSupport {

  private static final LocalDate TODAY = LocalDate.now();
  private static final String RANGE = "from=" + TODAY.minusDays(7) + "&to=" + TODAY;

  private void seed(MockHttpSession recruit) throws Exception {
    postAs(recruit, "/api/tasks", Map.of("entryDate", TODAY.toString(), "title", "=SUM(A1), \"x\"",
        "category", "SETUP", "status", "DONE", "priority", "LOW"));
    postAs(recruit, "/api/issues", Map.of("entryDate", TODAY.toString(), "title", "VPN",
        "severity", "HIGH", "status", "OPEN"));
    postAs(recruit, "/api/feedback", Map.of("entryDate", TODAY.toString(), "subject", "Buddy",
        "type", "POSITIVE", "details", "Great"));
  }

  @Test
  void recruitDownloadsOwnCombinedCsv() throws Exception {
    MockHttpSession recruit = login(createUser(Role.RECRUIT));
    seed(recruit);
    String csv =
        getAs(recruit, "/api/reports?type=COMBINED&format=CSV&" + RANGE)
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "text/csv;charset=UTF-8"))
            .andExpect(header().string("Content-Disposition",
                org.hamcrest.Matchers.containsString("onboarding-combined-")))
            .andReturn().getResponse().getContentAsString();
    String[] lines = csv.split("\r\n");
    assertThat(lines[0]).startsWith("record_type,date,title");
    assertThat(lines).hasSize(4);
    assertThat(csv).contains("\"'=SUM(A1), \"\"x\"\"\"").contains("ISSUE").contains("FEEDBACK");
  }

  @Test
  void managerDownloadsPdfForAssignedRecruitOnly() throws Exception {
    User manager = createUser(Role.MANAGER);
    User recruit = createUser(Role.RECRUIT, manager);
    User other = createUser(Role.RECRUIT);
    seed(login(recruit));
    MockHttpSession session = login(manager);

    byte[] pdf =
        getAs(session, "/api/reports?type=TASKS&format=PDF&recruitId=" + recruit.getId() + "&" + RANGE)
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andReturn().getResponse().getContentAsByteArray();
    assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
    getAs(session, "/api/reports?type=TASKS&format=PDF&recruitId=" + other.getId() + "&" + RANGE)
        .andExpect(status().isForbidden());
    getAs(session, "/api/reports?type=TASKS&format=CSV&" + RANGE).andExpect(status().isBadRequest());
  }

  @Test
  void validatesRangeAndRecruitScope() throws Exception {
    User recruit = createUser(Role.RECRUIT);
    MockHttpSession session = login(recruit);
    getAs(session, "/api/reports?type=TASKS&format=CSV&from=" + TODAY.minusDays(400) + "&to=" + TODAY)
        .andExpect(status().isBadRequest());
    getAs(session, "/api/reports?type=TASKS&format=CSV&from=" + TODAY + "&to=" + TODAY.minusDays(1))
        .andExpect(status().isBadRequest());
    getAs(session, "/api/reports?type=TASKS&format=CSV&" + RANGE + "&recruitId="
            + createUser(Role.RECRUIT).getId())
        .andExpect(status().isForbidden());
    getAs(session, "/api/reports?type=NOPE&format=CSV&" + RANGE).andExpect(status().isBadRequest());
  }
}
