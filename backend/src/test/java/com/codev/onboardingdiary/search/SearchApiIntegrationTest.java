package com.codev.onboardingdiary.search;

import static com.codev.onboardingdiary.support.DiaryFixtures.feedback;
import static com.codev.onboardingdiary.support.DiaryFixtures.issue;
import static com.codev.onboardingdiary.support.DiaryFixtures.note;
import static com.codev.onboardingdiary.support.DiaryFixtures.task;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SearchApiIntegrationTest extends ApiTestSupport {

  private String manager;
  private String recruit;
  private String otherRecruit;
  private String word;

  @BeforeEach
  void setUp() throws Exception {
    String admin = adminToken();
    String managerEmail = randomEmail("manager");
    long managerId = createUser(admin, managerEmail, Role.MANAGER);
    manager = login(managerEmail, TEMP_PASSWORD);
    recruit = signupRecruit();
    otherRecruit = signupRecruit();
    putJson(
            admin,
            "/api/admin/users/" + userId(recruit) + "/manager",
            Map.of("managerId", managerId))
        .andExpect(status().isOk());
    word = "kube" + UUID.randomUUID().toString().substring(0, 6);

    postJson(recruit, "/api/tasks", task("Set up " + word + " cluster", "TODO", TODAY));
    postJson(recruit, "/api/tasks", task("Unrelated", "TODO", TODAY));
    Map<String, Object> blocker = new HashMap<>(issue("Access denied", "HIGH", TODAY));
    blocker.put("description", "Cannot reach the " + word.toUpperCase() + " dashboard");
    postJson(recruit, "/api/issues", blocker);
    postJson(recruit, "/api/feedback", feedback("More " + word + " docs", "SUGGESTION", TODAY));
    postJson(recruit, "/api/notes", note(word + " shared tips", true, TODAY));
    postJson(recruit, "/api/notes", note(word + " private thoughts", false, TODAY));
    postJson(otherRecruit, "/api/tasks", task(word + " for someone else", "TODO", TODAY));
  }

  @Test
  void recruitSearchesOwnEntriesAcrossLogs() throws Exception {
    getJson(recruit, "/api/search?q=" + word)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groups", hasSize(4)))
        .andExpect(jsonPath("$.groups[0].type").value("TASK"))
        .andExpect(jsonPath("$.groups[0].total").value(1))
        .andExpect(jsonPath("$.groups[0].hits[0].title").value("Set up " + word + " cluster"))
        .andExpect(jsonPath("$.groups[1].type").value("ISSUE"))
        .andExpect(jsonPath("$.groups[1].total").value(1))
        .andExpect(
            jsonPath("$.groups[1].hits[0].snippet")
                .value("Cannot reach the " + word.toUpperCase() + " dashboard"))
        .andExpect(jsonPath("$.groups[2].total").value(1))
        .andExpect(jsonPath("$.groups[3].type").value("NOTE"))
        .andExpect(jsonPath("$.groups[3].total").value(2));
  }

  @Test
  void filtersByTypeAndLimitsHits() throws Exception {
    getJson(recruit, "/api/search?q=" + word + "&type=NOTE&limit=1")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groups", hasSize(1)))
        .andExpect(jsonPath("$.groups[0].total").value(2))
        .andExpect(jsonPath("$.groups[0].hits", hasSize(1)));
  }

  @Test
  void findsNotesByTag() throws Exception {
    String tag = "tag" + UUID.randomUUID().toString().substring(0, 6);
    postJson(
        recruit,
        "/api/notes",
        Map.of(
            "entryDate",
            TODAY.toString(),
            "title",
            "Untitled",
            "content",
            "Body",
            "tags",
            List.of(tag),
            "shared",
            false));
    getJson(recruit, "/api/search?q=" + tag + "&type=NOTE")
        .andExpect(jsonPath("$.groups[0].total").value(1))
        .andExpect(jsonPath("$.groups[0].hits[0].title").value("Untitled"));
  }

  @Test
  void recruitsNeverSeeOtherRecruitsEntries() throws Exception {
    var result = body(getJson(otherRecruit, "/api/search?q=" + word));
    result
        .get("groups")
        .forEach(
            group ->
                assertThat(group.get("total").asLong())
                    .isEqualTo("TASK".equals(group.get("type").asText()) ? 1 : 0));
  }

  @Test
  void managerTeamSearchCoversAssignedRecruitsAndSharedNotesOnly() throws Exception {
    getJson(manager, "/api/search?q=" + word + "&scope=TEAM")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groups[0].total").value(1))
        .andExpect(jsonPath("$.groups[0].hits[0].ownerName").isNotEmpty())
        .andExpect(jsonPath("$.groups[3].total").value(1))
        .andExpect(jsonPath("$.groups[3].hits[0].title").value(word + " shared tips"));
  }

  @Test
  void recruitCannotSearchTeam() throws Exception {
    getJson(recruit, "/api/search?q=" + word + "&scope=TEAM").andExpect(status().isForbidden());
  }

  @Test
  void rejectsInvalidQueries() throws Exception {
    getJson(recruit, "/api/search?q=a").andExpect(status().isBadRequest());
    getJson(recruit, "/api/search?q=" + "x".repeat(101)).andExpect(status().isBadRequest());
    getJson(recruit, "/api/search?q=abc&limit=0").andExpect(status().isBadRequest());
    getJson(recruit, "/api/search?q=abc&type=BOGUS").andExpect(status().isBadRequest());
  }

  @Test
  void treatsWildcardsLiterally() throws Exception {
    getJson(recruit, "/api/search?q=%25%25")
        .andExpect(jsonPath("$.groups[0].total").value(0))
        .andExpect(jsonPath("$.groups[3].total").value(0));
  }

  @Test
  void snippetCentresOnMatch() {
    String longText = "a".repeat(300) + " needle " + "b".repeat(300);
    String snippet = SearchService.snippet("needle", null, longText);
    assertThat(snippet).startsWith("…").endsWith("…").contains("needle");
    assertThat(SearchService.snippet("zzz", "  first   body ")).isEqualTo("first body");
    assertThat(SearchService.snippet("zzz")).isNull();
  }
}
