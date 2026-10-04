package com.codev.onboardingdiary.diary;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IssueApiIntegrationTest extends ApiTestSupport {

  @Test
  void createsOpenIssueByDefault() throws Exception {
    String token = signupRecruit();

    postJson(token, "/api/issues", issue("VPN fails", "HIGH"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("OPEN"))
        .andExpect(jsonPath("$.severity").value("HIGH"))
        .andExpect(jsonPath("$.resolvedAt").value(nullValue()));
  }

  @Test
  void resolvingRequiresNotesAndRecordsTimestamp() throws Exception {
    String token = signupRecruit();
    long id = createdId(postJson(token, "/api/issues", issue("No repo access", "MEDIUM")));

    patchJson(token, "/api/issues/" + id + "/status", Map.of("status", "RESOLVED"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("resolutionNotes"));

    patchJson(
            token,
            "/api/issues/" + id + "/status",
            Map.of("status", "RESOLVED", "resolutionNotes", "Granted by IT"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resolutionNotes").value("Granted by IT"))
        .andExpect(jsonPath("$.resolvedAt").value(notNullValue()));

    patchJson(token, "/api/issues/" + id + "/status", Map.of("status", "CLOSED"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.resolutionNotes").value("Granted by IT"));

    patchJson(token, "/api/issues/" + id + "/status", Map.of("status", "OPEN"))
        .andExpect(jsonPath("$.resolvedAt").value(nullValue()));
  }

  @Test
  void createRejectsResolvedWithoutNotes() throws Exception {
    String token = signupRecruit();
    Map<String, Object> body = issue("Closed already", "LOW");
    body.put("status", "CLOSED");
    body.put("resolutionNotes", "   ");

    postJson(token, "/api/issues", body)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("resolutionNotes"));
  }

  @Test
  void linksOnlyOwnTasksAndUnlinksWhenTaskDeleted() throws Exception {
    String owner = signupRecruit();
    String other = signupRecruit();
    long ownTask =
        createdId(postJson(owner, "/api/tasks", TaskApiIntegrationTest.task("Setup", "SETUP")));
    long otherTask =
        createdId(postJson(other, "/api/tasks", TaskApiIntegrationTest.task("Theirs", "SETUP")));

    Map<String, Object> foreign = issue("Blocked", "HIGH");
    foreign.put("relatedTaskId", otherTask);
    postJson(owner, "/api/issues", foreign)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("relatedTaskId"));

    Map<String, Object> linked = issue("Blocked", "HIGH");
    linked.put("relatedTaskId", ownTask);
    long issueId =
        createdId(
            postJson(owner, "/api/issues", linked)
                .andExpect(jsonPath("$.relatedTaskTitle").value("Setup")));

    deleteJson(owner, "/api/tasks/" + ownTask).andExpect(status().isNoContent());
    getJson(owner, "/api/issues/" + issueId)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.relatedTaskId").value(nullValue()));
  }

  @Test
  void otherUsersGetNotFound() throws Exception {
    String owner = signupRecruit();
    String intruder = signupRecruit();
    long id = createdId(postJson(owner, "/api/issues", issue("Mine", "LOW")));

    getJson(intruder, "/api/issues/" + id).andExpect(status().isNotFound());
    putJson(intruder, "/api/issues/" + id, issue("x", "LOW")).andExpect(status().isNotFound());
    deleteJson(intruder, "/api/issues/" + id).andExpect(status().isNotFound());
  }

  @Test
  void filtersByStatusSeverityAndText() throws Exception {
    String token = signupRecruit();
    postJson(token, "/api/issues", issue("Badge not working", "LOW"))
        .andExpect(status().isCreated());
    Map<String, Object> critical = issue("Prod access", "CRITICAL");
    critical.put("status", "IN_PROGRESS");
    postJson(token, "/api/issues", critical).andExpect(status().isCreated());

    getJson(token, "/api/issues?severity=CRITICAL,HIGH")
        .andExpect(jsonPath("$.content[*].title").value(contains("Prod access")));
    getJson(token, "/api/issues?status=OPEN")
        .andExpect(jsonPath("$.content[*].title").value(contains("Badge not working")));
    getJson(token, "/api/issues?q=badge").andExpect(jsonPath("$.totalElements").value(1));
  }

  @Test
  void staleVersionIsRejected() throws Exception {
    String token = signupRecruit();
    long id = createdId(postJson(token, "/api/issues", issue("Original", "LOW")));
    Map<String, Object> stale = issue("Edit", "LOW");
    stale.put("version", 5);

    putJson(token, "/api/issues/" + id, stale).andExpect(status().isConflict());
  }

  private static Map<String, Object> issue(String title, String severity) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", TODAY.toString());
    body.put("title", title);
    body.put("description", "Details");
    body.put("severity", severity);
    return body;
  }
}
