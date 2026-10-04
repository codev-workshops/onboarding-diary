package com.codev.onboardingdiary.checklist;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
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
class ChecklistApiIntegrationTest extends ApiTestSupport {

  private static final String TEMPLATES = "/api/admin/checklists/templates";

  private String admin;
  private String manager;
  private long managerId;
  private String recruit;
  private long recruitId;
  private String otherRecruit;
  private long otherRecruitId;

  @BeforeEach
  void setUp() throws Exception {
    admin = adminToken();
    String managerEmail = randomEmail("manager");
    managerId = createUser(admin, managerEmail, Role.MANAGER);
    manager = login(managerEmail, TEMP_PASSWORD);
    recruit = signupRecruit();
    recruitId = userId(recruit);
    otherRecruit = signupRecruit();
    otherRecruitId = userId(otherRecruit);
    putJson(admin, "/api/admin/users/" + recruitId + "/manager", Map.of("managerId", managerId))
        .andExpect(status().isOk());
  }

  private static Map<String, Object> template(String name) {
    return Map.of(
        "name",
        name,
        "description",
        "First steps",
        "items",
        List.of(
            Map.of("title", "Get laptop", "dueDayOffset", 0),
            Map.of("title", "Meet the team", "description", "Say hi", "dueDayOffset", 30)));
  }

  private static String uniqueName() {
    return "Engineering week 1 " + UUID.randomUUID();
  }

  private long createTemplate() throws Exception {
    return createdId(
        postJson(admin, TEMPLATES, template(uniqueName())).andExpect(status().isCreated()));
  }

  private JsonNode assignToRecruit(long templateId) throws Exception {
    postJson(
            admin,
            TEMPLATES + "/" + templateId + "/assignments",
            Map.of("recruitIds", List.of(recruitId)))
        .andExpect(status().isOk());
    return body(getJson(recruit, "/api/checklists")).get(0);
  }

  @Test
  void adminCreatesTemplateAndAssignsItOnce() throws Exception {
    long templateId = createTemplate();
    getJson(admin, TEMPLATES + "/" + templateId)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(2)))
        .andExpect(jsonPath("$.items[1].description").value("Say hi"))
        .andExpect(jsonPath("$.assignedCount").value(0));

    String assign = TEMPLATES + "/" + templateId + "/assignments";
    postJson(admin, assign, Map.of("recruitIds", List.of(recruitId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.assigned[0]").value(recruitId))
        .andExpect(jsonPath("$.skipped", hasSize(0)));
    postJson(admin, assign, Map.of("recruitIds", List.of(recruitId)))
        .andExpect(jsonPath("$.assigned", hasSize(0)))
        .andExpect(jsonPath("$.skipped[0]").value(recruitId));

    getJson(recruit, "/api/checklists")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].templateId").value(templateId))
        .andExpect(jsonPath("$[0].totalItems").value(2))
        .andExpect(jsonPath("$[0].completedItems").value(0))
        .andExpect(jsonPath("$[0].items[0].title").value("Get laptop"))
        .andExpect(jsonPath("$[0].items[0].dueDate").value(START_DATE.toString()))
        .andExpect(jsonPath("$[0].items[0].overdue").value(true))
        .andExpect(jsonPath("$[0].items[1].dueDate").value(START_DATE.plusDays(30).toString()))
        .andExpect(jsonPath("$[0].items[1].overdue").value(false));
    getJson(admin, assign)
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].recruitName").value("Test Recruit"));
  }

  @Test
  void recruitTicksAndUnticksItems() throws Exception {
    JsonNode checklist = assignToRecruit(createTemplate());
    String item =
        "/api/checklists/"
            + checklist.get("id").asLong()
            + "/items/"
            + checklist.get("items").get(0).get("id").asLong();

    patchJson(recruit, item, Map.of("completed", true))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.completedItems").value(1))
        .andExpect(jsonPath("$.completionPct").value(50.0))
        .andExpect(jsonPath("$.items[0].completedAt").value(notNullValue()))
        .andExpect(jsonPath("$.items[0].overdue").value(false));
    getJson(manager, "/api/manager/recruits")
        .andExpect(jsonPath("$[0].checklistItems").value(2))
        .andExpect(jsonPath("$[0].checklistItemsCompleted").value(1));

    patchJson(recruit, item, Map.of("completed", false))
        .andExpect(jsonPath("$.completedItems").value(0))
        .andExpect(jsonPath("$.items[0].completedAt").value(nullValue()));
    patchJson(recruit, item, Map.of()).andExpect(status().isBadRequest());
  }

  @Test
  void recruitsCannotTouchOtherChecklists() throws Exception {
    JsonNode checklist = assignToRecruit(createTemplate());
    long assignmentId = checklist.get("id").asLong();
    long itemId = checklist.get("items").get(0).get("id").asLong();

    patchJson(
            otherRecruit,
            "/api/checklists/" + assignmentId + "/items/" + itemId,
            Map.of("completed", true))
        .andExpect(status().isNotFound());
    patchJson(
            recruit,
            "/api/checklists/" + (assignmentId + 999) + "/items/" + itemId,
            Map.of("completed", true))
        .andExpect(status().isNotFound());
    getJson(otherRecruit, "/api/checklists").andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void managersReadOnlyTheirRecruitsChecklists() throws Exception {
    assignToRecruit(createTemplate());
    getJson(manager, "/api/manager/recruits/" + recruitId + "/checklists")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)));
    getJson(manager, "/api/manager/recruits/" + otherRecruitId + "/checklists")
        .andExpect(status().isForbidden());
    getJson(recruit, "/api/manager/recruits/" + recruitId + "/checklists")
        .andExpect(status().isForbidden());
  }

  @Test
  void onlyAdminsManageTemplates() throws Exception {
    getJson(recruit, TEMPLATES).andExpect(status().isForbidden());
    postJson(manager, TEMPLATES, template(uniqueName())).andExpect(status().isForbidden());
  }

  @Test
  void validatesTemplatesAndAssignments() throws Exception {
    Map<String, Object> noItems = new HashMap<>(template(uniqueName()));
    noItems.put("items", List.of());
    postJson(admin, TEMPLATES, noItems).andExpect(status().isBadRequest());

    Map<String, Object> badOffset = new HashMap<>(template(uniqueName()));
    badOffset.put("items", List.of(Map.of("title", "X", "dueDayOffset", -1)));
    postJson(admin, TEMPLATES, badOffset).andExpect(status().isBadRequest());

    Map<String, Object> blankTitle = new HashMap<>(template(uniqueName()));
    blankTitle.put("items", List.of(Map.of("title", " ")));
    postJson(admin, TEMPLATES, blankTitle).andExpect(status().isBadRequest());

    String name = uniqueName();
    postJson(admin, TEMPLATES, template(name)).andExpect(status().isCreated());
    postJson(admin, TEMPLATES, template(name.toUpperCase())).andExpect(status().isConflict());

    long templateId = createTemplate();
    postJson(
            admin,
            TEMPLATES + "/" + templateId + "/assignments",
            Map.of("recruitIds", List.of(managerId)))
        .andExpect(status().isBadRequest());
    postJson(admin, TEMPLATES + "/999999/assignments", Map.of("recruitIds", List.of(recruitId)))
        .andExpect(status().isNotFound());
  }

  @Test
  void templateChangesDoNotAffectAssignedChecklists() throws Exception {
    long templateId = createTemplate();
    assignToRecruit(templateId);

    Map<String, Object> changed = new HashMap<>(template(uniqueName()));
    changed.put("items", List.of(Map.of("title", "New only")));
    putJson(admin, TEMPLATES + "/" + templateId, changed)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(1)))
        .andExpect(jsonPath("$.assignedCount").value(1));
    getJson(recruit, "/api/checklists")
        .andExpect(jsonPath("$[0].items", hasSize(2)))
        .andExpect(jsonPath("$[0].items[0].title").value("Get laptop"));

    deleteJson(admin, TEMPLATES + "/" + templateId).andExpect(status().isNoContent());
    getJson(admin, TEMPLATES + "/" + templateId).andExpect(status().isNotFound());
    getJson(recruit, "/api/checklists")
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].templateId").value(nullValue()));
  }

  @Test
  void staleTemplateUpdateIsRejected() throws Exception {
    long templateId = createTemplate();
    Map<String, Object> stale = new HashMap<>(template(uniqueName()));
    stale.put("version", 99);
    putJson(admin, TEMPLATES + "/" + templateId, stale).andExpect(status().isConflict());
  }

  @Test
  void adminUnassignsChecklist() throws Exception {
    long templateId = createTemplate();
    assignToRecruit(templateId);
    long assignmentId =
        body(getJson(admin, TEMPLATES + "/" + templateId + "/assignments"))
            .get(0)
            .get("id")
            .asLong();

    deleteJson(admin, "/api/admin/checklists/assignments/" + assignmentId)
        .andExpect(status().isNoContent());
    getJson(recruit, "/api/checklists").andExpect(jsonPath("$", hasSize(0)));
    getJson(admin, "/api/admin/audit-log?action=CHECKLIST_UNASSIGNED").andExpect(status().isOk());
  }
}
