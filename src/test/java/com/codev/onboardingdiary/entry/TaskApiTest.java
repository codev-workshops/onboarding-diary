package com.codev.onboardingdiary.entry;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class TaskApiTest extends ApiTestSupport {

  private static Map<String, Object> task(String title, LocalDate date, String category,
      String status) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", date.toString());
    body.put("title", title);
    body.put("description", "  details  ");
    body.put("category", category);
    body.put("status", status);
    body.put("priority", "MEDIUM");
    return body;
  }

  @Test
  void recruitCreatesUpdatesAndDeletesTask() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    long id =
        body(postAs(session, "/api/tasks", task("Set up laptop", LocalDate.now(), "SETUP", "TODO"))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.description").value("details")))
            .get("id")
            .asLong();

    putAs(session, "/api/tasks/" + id, task("Set up laptop", LocalDate.now(), "SETUP", "DONE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DONE"));

    deleteAs(session, "/api/tasks/" + id).andExpect(status().isNoContent());
    getAs(session, "/api/tasks/" + id).andExpect(status().isNotFound());
  }

  @Test
  void listFiltersByCategoryStatusAndDateNewestFirst() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    LocalDate today = LocalDate.now();
    postAs(session, "/api/tasks", task("Old", today.minusDays(10), "TRAINING", "DONE"));
    postAs(session, "/api/tasks", task("New", today, "TRAINING", "DONE"));
    postAs(session, "/api/tasks", task("Other", today, "MEETING", "TODO"));

    getAs(session, "/api/tasks?category=TRAINING&status=DONE")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].title").value("New"));
    getAs(session, "/api/tasks?from=" + today.minusDays(1))
        .andExpect(jsonPath("$.totalElements").value(2));
    getAs(session, "/api/tasks?from=" + today + "&to=" + today.minusDays(1))
        .andExpect(status().isBadRequest());
    getAs(session, "/api/tasks?status=NOPE").andExpect(status().isBadRequest());
  }

  @Test
  void validationErrorsAreReportedPerField() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    Map<String, Object> body = task(" ", LocalDate.now().plusYears(2), "SETUP", "TODO");
    postAs(session, "/api/tasks", body)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("title"));
    body.put("title", "Future");
    postAs(session, "/api/tasks", body)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("entryDate"));
  }

  @Test
  void otherRecruitsTasksAreInvisible() throws Exception {
    MockHttpSession owner = login(createUser(Role.RECRUIT));
    MockHttpSession other = login(createUser(Role.RECRUIT));
    long id =
        body(postAs(owner, "/api/tasks", task("Mine", LocalDate.now(), "SETUP", "TODO")))
            .get("id")
            .asLong();

    getAs(other, "/api/tasks/" + id).andExpect(status().isNotFound());
    putAs(other, "/api/tasks/" + id, task("Hijack", LocalDate.now(), "SETUP", "DONE"))
        .andExpect(status().isNotFound());
    deleteAs(other, "/api/tasks/" + id).andExpect(status().isNotFound());
    getAs(other, "/api/tasks").andExpect(jsonPath("$.totalElements").value(0));
  }

  @Test
  void managersAndAdminsCannotUseRecruitTaskLog() throws Exception {
    getAs(login(createUser(Role.MANAGER)), "/api/tasks").andExpect(status().isForbidden());
    getAs(login(createUser(Role.ADMIN)), "/api/tasks").andExpect(status().isForbidden());
  }
}
