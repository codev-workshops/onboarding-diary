package com.codev.onboardingdiary.entry;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class FeedbackAndNoteApiTest extends ApiTestSupport {

  private static final String TODAY = LocalDate.now().toString();

  @Test
  void feedbackCrudAndTypeFilter() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    long id =
        body(postAs(
                    session,
                    "/api/feedback",
                    Map.of(
                        "entryDate", TODAY, "subject", "Buddy", "type", "POSITIVE",
                        "details", "Great buddy"))
                .andExpect(status().isCreated()))
            .get("id")
            .asLong();
    postAs(
        session,
        "/api/feedback",
        Map.of("entryDate", TODAY, "subject", "Docs", "type", "CONCERN", "details", "Outdated"));

    getAs(session, "/api/feedback?type=CONCERN")
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].subject").value("Docs"));
    postAs(session, "/api/feedback", Map.of("entryDate", TODAY, "subject", "x", "type", "BAD"))
        .andExpect(status().isBadRequest());
    deleteAs(session, "/api/feedback/" + id).andExpect(status().isNoContent());
  }

  @Test
  void noteTagsAreNormalisedAndFilterable() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    postAs(
            session,
            "/api/notes",
            Map.of(
                "entryDate", TODAY, "title", "Setup", "content", "VPN steps",
                "tags", List.of(" VPN ", "vpn", "setup", "")))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.tags.length()").value(2))
        .andExpect(jsonPath("$.tags[0]").value("setup"))
        .andExpect(jsonPath("$.tags[1]").value("vpn"));
    postAs(
        session,
        "/api/notes",
        Map.of("entryDate", TODAY, "title", "Team", "content", "Lunch", "tags", List.of("team")));

    getAs(session, "/api/notes?tag=VPN")
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].title").value("Setup"));
    getAs(session, "/api/notes/tags")
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0]").value("setup"));
  }

  @Test
  void noteTagLimitsAreEnforced() throws Exception {
    MockHttpSession session = login(createUser(Role.RECRUIT));
    List<String> tooMany = new ArrayList<>();
    for (int i = 0; i < 11; i++) {
      tooMany.add("t" + i);
    }
    postAs(
            session,
            "/api/notes",
            Map.of("entryDate", TODAY, "title", "T", "content", "C", "tags", tooMany))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors[0].field").value("tags"));
    postAs(
            session,
            "/api/notes",
            Map.of(
                "entryDate", TODAY, "title", "T", "content", "C",
                "tags", Collections.singletonList("bad!tag")))
        .andExpect(status().isBadRequest());
  }
}
