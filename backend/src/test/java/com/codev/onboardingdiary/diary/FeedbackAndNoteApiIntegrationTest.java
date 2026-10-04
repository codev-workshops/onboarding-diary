package com.codev.onboardingdiary.diary;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedbackAndNoteApiIntegrationTest extends ApiTestSupport {

  @Test
  void feedbackCrudAndTypeFilter() throws Exception {
    String token = signupRecruit();
    long id = createdId(postJson(token, "/api/feedback", feedback("Great buddy", "POSITIVE")));
    postJson(token, "/api/feedback", feedback("Docs outdated", "CONCERN"))
        .andExpect(status().isCreated());

    getJson(token, "/api/feedback?type=CONCERN,SUGGESTION")
        .andExpect(jsonPath("$.content[*].subject").value(contains("Docs outdated")));

    Map<String, Object> edit = feedback("Great buddy system", "SUGGESTION");
    edit.put("version", 0);
    putJson(token, "/api/feedback/" + id, edit)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.type").value("SUGGESTION"));
    putJson(token, "/api/feedback/" + id, edit).andExpect(status().isConflict());

    deleteJson(token, "/api/feedback/" + id).andExpect(status().isNoContent());
    getJson(token, "/api/feedback").andExpect(jsonPath("$.totalElements").value(1));
  }

  @Test
  void feedbackRequiresDetailsAndIsOwnerScoped() throws Exception {
    String owner = signupRecruit();
    String intruder = signupRecruit();
    Map<String, Object> noDetails = feedback("Subject", "POSITIVE");
    noDetails.remove("details");
    postJson(owner, "/api/feedback", noDetails)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("details"));

    long id = createdId(postJson(owner, "/api/feedback", feedback("Mine", "POSITIVE")));
    getJson(intruder, "/api/feedback/" + id).andExpect(status().isNotFound());
    deleteJson(intruder, "/api/feedback/" + id).andExpect(status().isNotFound());
  }

  @Test
  void noteTagsAreNormalizedAndSuggestedPerOwner() throws Exception {
    String token = signupRecruit();
    String other = signupRecruit();
    postJson(token, "/api/notes", note("Week 1", List.of(" Git ", "git", "Onboarding")))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.tags").value(contains("git", "onboarding")))
        .andExpect(jsonPath("$.shared").value(false));
    postJson(other, "/api/notes", note("Theirs", List.of("secret")))
        .andExpect(status().isCreated());

    getJson(token, "/api/notes/tags").andExpect(jsonPath("$").value(contains("git", "onboarding")));
  }

  @Test
  void noteRejectsTooManyOrTooLongTags() throws Exception {
    String token = signupRecruit();
    List<String> eleven = IntStream.range(0, 11).mapToObj(i -> "tag" + i).toList();
    postJson(token, "/api/notes", note("Many", eleven))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("tags"));
    postJson(token, "/api/notes", note("Long", List.of("x".repeat(41))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void noteFiltersByTagAndKeywordAndKeepsSharedFlag() throws Exception {
    String token = signupRecruit();
    Map<String, Object> shared = note("Architecture overview", List.of("design"));
    shared.put("shared", true);
    long sharedId =
        createdId(
            postJson(token, "/api/notes", shared).andExpect(jsonPath("$.shared").value(true)));
    Map<String, Object> other = note("Lunch spots", List.of("misc"));
    other.put("content", "The canteen has great curry");
    postJson(token, "/api/notes", other).andExpect(status().isCreated());

    getJson(token, "/api/notes?tag=DESIGN")
        .andExpect(jsonPath("$.content[*].title").value(contains("Architecture overview")));
    getJson(token, "/api/notes?tag=design,misc").andExpect(jsonPath("$.totalElements").value(2));
    getJson(token, "/api/notes?q=curry")
        .andExpect(jsonPath("$.content[*].title").value(contains("Lunch spots")));

    Map<String, Object> edit = note("Architecture overview", List.of());
    edit.put("version", 0);
    putJson(token, "/api/notes/" + sharedId, edit)
        .andExpect(jsonPath("$.shared").value(false))
        .andExpect(jsonPath("$.tags").isEmpty());
  }

  @Test
  void notesAreOwnerScoped() throws Exception {
    String owner = signupRecruit();
    String intruder = signupRecruit();
    long id = createdId(postJson(owner, "/api/notes", note("Private", List.of())));

    getJson(intruder, "/api/notes/" + id).andExpect(status().isNotFound());
    putJson(intruder, "/api/notes/" + id, note("x", List.of())).andExpect(status().isNotFound());
    deleteJson(intruder, "/api/notes/" + id).andExpect(status().isNotFound());
    deleteJson(owner, "/api/notes/" + id).andExpect(status().isNoContent());
  }

  @Test
  void lookupsListEnumValues() throws Exception {
    String token = signupRecruit();
    getJson(token, "/api/lookups")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.taskCategories[0]").value("TRAINING"))
        .andExpect(jsonPath("$.issueSeverities[3]").value("CRITICAL"))
        .andExpect(
            jsonPath("$.feedbackTypes").value(contains("POSITIVE", "SUGGESTION", "CONCERN")));
  }

  @Test
  void startDateIsLockedOnceEntriesExist() throws Exception {
    String token = signupRecruit();
    Map<String, Object> profile =
        Map.of(
            "fullName", "Test Recruit",
            "department", "Engineering",
            "startDate", START_DATE.minusDays(1).toString());
    putJson(token, "/api/profile", profile).andExpect(status().isOk());

    postJson(token, "/api/notes", note("First", List.of())).andExpect(status().isCreated());
    Map<String, Object> moved = new HashMap<>(profile);
    moved.put("startDate", START_DATE.toString());
    putJson(token, "/api/profile", moved)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].field").value("startDate"));
    Map<String, Object> sameDate = new HashMap<>(profile);
    sameDate.put("department", "Platform");
    putJson(token, "/api/profile", sameDate).andExpect(status().isOk());
  }

  private static Map<String, Object> feedback(String subject, String type) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", TODAY.toString());
    body.put("subject", subject);
    body.put("type", type);
    body.put("details", "Some details");
    return body;
  }

  private static Map<String, Object> note(String title, List<String> tags) {
    Map<String, Object> body = new HashMap<>();
    body.put("entryDate", TODAY.toString());
    body.put("title", title);
    body.put("content", "**Markdown** content");
    body.put("tags", tags);
    return body;
  }
}
