package com.codev.onboardingdiary.diary;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
class TaskApiIntegrationTest extends ApiTestSupport {

  @Test
  void createsTaskWithDefaultsAndLocation() throws Exception {
    String token = signupRecruit();

    postJson(token, "/api/tasks", task("Set up laptop", "SETUP"))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", startsWith("/api/tasks/")))
        .andExpect(jsonPath("$.title").value("Set up laptop"))
        .andExpect(jsonPath("$.status").value("TODO"))
        .andExpect(jsonPath("$.priority").value("MEDIUM"))
        .andExpect(jsonPath("$.completedAt").value(nullValue()))
        .andExpect(jsonPath("$.version").value(0));
  }

  @Test
  void requiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/tasks")).andExpect(status().isUnauthorized());
  }

  @Test
  void otherUsersCannotSeeOrChangeTask() throws Exception {
    String owner = signupRecruit();
    String intruder = signupRecruit();
    long id = createdId(postJson(owner, "/api/tasks", task("Private", "CODING")));

    getJson(intruder, "/api/tasks/" + id).andExpect(status().isNotFound());
    putJson(intruder, "/api/tasks/" + id, task("Hijacked", "CODING"))
        .andExpect(status().isNotFound());
    patchJson(intruder, "/api/tasks/" + id + "/status", Map.of("status", "COMPLETED"))
        .andExpect(status().isNotFound());
    deleteJson(intruder, "/api/tasks/" + id).andExpect(status().isNotFound());
    getJson(intruder, "/api/tasks").andExpect(jsonPath("$.totalElements").value(0));
    getJson(owner, "/api/tasks/" + id).andExpect(jsonPath("$.title").value("Private"));
  }

  @Test
  void rejectsInvalidPayloads() throws Exception {
    String token = signupRecruit();

    Map<String, Object> blank = task(" ", "SETUP");
    postJson(token, "/api/tasks", blank)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("title"));

    Map<String, Object> badCategory = task("Title", "NOT_A_CATEGORY");
    postJson(token, "/api/tasks", badCategory).andExpect(status().isBadRequest());

    Map<String, Object> future = task("Title", "SETUP");
    future.put("entryDate", TODAY.plusDays(2).toString());
    postJson(token, "/api/tasks", future)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("entryDate"));

    Map<String, Object> tooEarly = task("Title", "SETUP");
    tooEarly.put("entryDate", START_DATE.minusDays(31).toString());
    postJson(token, "/api/tasks", tooEarly)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("entryDate"));

    Map<String, Object> earliestAllowed = task("Title", "SETUP");
    earliestAllowed.put("entryDate", START_DATE.minusDays(30).toString());
    postJson(token, "/api/tasks", earliestAllowed).andExpect(status().isCreated());
  }

  @Test
  void statusChangeRecordsAndClearsCompletion() throws Exception {
    String token = signupRecruit();
    long id = createdId(postJson(token, "/api/tasks", task("Read handbook", "TRAINING")));

    patchJson(token, "/api/tasks/" + id + "/status", Map.of("status", "COMPLETED"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("COMPLETED"))
        .andExpect(jsonPath("$.completedAt").value(notNullValue()));
    patchJson(token, "/api/tasks/" + id + "/status", Map.of("status", "IN_PROGRESS"))
        .andExpect(jsonPath("$.completedAt").value(nullValue()));
  }

  @Test
  void staleVersionIsRejectedWithConflict() throws Exception {
    String token = signupRecruit();
    long id = createdId(postJson(token, "/api/tasks", task("Original", "MEETING")));

    Map<String, Object> first = task("First edit", "MEETING");
    first.put("version", 0);
    putJson(token, "/api/tasks/" + id, first)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.version").value(1));

    Map<String, Object> stale = task("Second edit", "MEETING");
    stale.put("version", 0);
    putJson(token, "/api/tasks/" + id, stale).andExpect(status().isConflict());
    getJson(token, "/api/tasks/" + id).andExpect(jsonPath("$.title").value("First edit"));
  }

  @Test
  void filtersSortsAndPaginates() throws Exception {
    String token = signupRecruit();
    Map<String, Object> older = task("Older setup", "SETUP");
    older.put("entryDate", TODAY.minusDays(5).toString());
    postJson(token, "/api/tasks", older).andExpect(status().isCreated());
    Map<String, Object> done = task("Code review", "CODING");
    done.put("status", "COMPLETED");
    done.put("priority", "HIGH");
    postJson(token, "/api/tasks", done).andExpect(status().isCreated());
    postJson(token, "/api/tasks", task("Team meeting", "MEETING")).andExpect(status().isCreated());

    getJson(token, "/api/tasks")
        .andExpect(jsonPath("$.totalElements").value(3))
        .andExpect(jsonPath("$.content[2].title").value("Older setup"));
    getJson(token, "/api/tasks?category=SETUP,CODING")
        .andExpect(
            jsonPath("$.content[*].title").value(containsInAnyOrder("Older setup", "Code review")));
    getJson(token, "/api/tasks?status=COMPLETED&priority=HIGH")
        .andExpect(jsonPath("$.content[*].title").value(contains("Code review")));
    getJson(token, "/api/tasks?from=" + TODAY.minusDays(1) + "&to=" + TODAY)
        .andExpect(jsonPath("$.content", hasSize(2)));
    getJson(token, "/api/tasks?q=MEET")
        .andExpect(jsonPath("$.content[*].title").value(contains("Team meeting")));
    getJson(token, "/api/tasks?q=%25").andExpect(jsonPath("$.totalElements").value(0));
    getJson(token, "/api/tasks?size=2&page=1&sort=entryDate,desc")
        .andExpect(jsonPath("$.content", hasSize(1)))
        .andExpect(jsonPath("$.totalPages").value(2))
        .andExpect(jsonPath("$.page").value(1));
    getJson(token, "/api/tasks?sort=title,asc")
        .andExpect(jsonPath("$.content[0].title").value("Code review"));
    getJson(token, "/api/tasks?sort=ownerId,asc").andExpect(status().isBadRequest());
    getJson(token, "/api/tasks?status=NOPE").andExpect(status().isBadRequest());
    getJson(token, "/api/tasks?from=" + TODAY + "&to=" + TODAY.minusDays(1))
        .andExpect(status().isBadRequest());
  }

  @Test
  void deletesTask() throws Exception {
    String token = signupRecruit();
    long id = createdId(postJson(token, "/api/tasks", task("Temporary", "OTHER")));

    deleteJson(token, "/api/tasks/" + id).andExpect(status().isNoContent());
    getJson(token, "/api/tasks/" + id).andExpect(status().isNotFound());
  }

  static Map<String, Object> task(String title, String category) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", TODAY.toString());
    body.put("title", title);
    body.put("description", "Details");
    body.put("category", category);
    return body;
  }
}
