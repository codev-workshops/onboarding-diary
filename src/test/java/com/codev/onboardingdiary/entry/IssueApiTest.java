package com.codev.onboardingdiary.entry;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class IssueApiTest extends ApiTestSupport {

  private static Map<String, Object> issue(String severity, String status, String notes) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", LocalDate.now().toString());
    body.put("title", "VPN access");
    body.put("severity", severity);
    body.put("status", status);
    body.put("resolutionNotes", notes);
    return body;
  }

  @Test
  void resolvingRequiresNotesAndTracksResolvedAt() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    long id =
        body(postAs(session, "/api/issues", issue("HIGH", "OPEN", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resolvedAt").isEmpty()))
            .get("id")
            .asLong();

    putAs(session, "/api/issues/" + id, issue("HIGH", "RESOLVED", " "))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("resolutionNotes"));

    putAs(session, "/api/issues/" + id, issue("HIGH", "RESOLVED", "IT reset token"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

    putAs(session, "/api/issues/" + id, issue("HIGH", "OPEN", "IT reset token"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resolvedAt").isEmpty())
        .andExpect(jsonPath("$.resolutionNotes").value("IT reset token"));
  }

  @Test
  void listFiltersByStatusAndSeverity() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    postAs(session, "/api/issues", issue("HIGH", "OPEN", null));
    postAs(session, "/api/issues", issue("LOW", "OPEN", null));
    postAs(session, "/api/issues", issue("HIGH", "CLOSED", "done"));

    getAs(session, "/api/issues?status=OPEN&severity=HIGH")
        .andExpect(jsonPath("$.totalElements").value(1));
    getAs(session, "/api/issues?severity=HIGH").andExpect(jsonPath("$.totalElements").value(2));
  }

  @Test
  void futureDateIsRejected() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    Map<String, Object> body = issue("LOW", "OPEN", null);
    body.put("entryDate", LocalDate.now().plusDays(5).toString());
    postAs(session, "/api/issues", body)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("entryDate"));
  }
}
