package com.codev.onboardingdiary.checklist;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class ChecklistApiTest extends ApiTestSupport {

  private long createTemplate(MockHttpSession session) throws Exception {
    return body(postAs(session, "/api/checklist-templates",
                Map.of("name", "Engineering", "items", List.of("Laptop", " Accounts ", "First PR")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.items[1]").value("Accounts")))
        .get("id").asLong();
  }

  @Test
  void managerAssignsChecklistAndRecruitTicksItems() throws Exception {
    User manager = createUser(Role.MANAGER);
    User recruit = createUser(Role.RECRUIT, manager);
    MockHttpSession managerSession = login(manager);
    long templateId = createTemplate(managerSession);

    postAs(managerSession, "/api/recruits/" + recruit.getId() + "/checklists",
            Map.of("templateId", templateId))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.total").value(3));

    MockHttpSession recruitSession = login(recruit);
    JsonNode checklist = body(getAs(recruitSession, "/api/checklists")).get(0);
    String itemPath = "/api/checklists/" + checklist.get("id").asLong() + "/items/"
        + checklist.get("items").get(0).get("id").asLong();
    putAs(recruitSession, itemPath, Map.of("done", true))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.done").value(1))
        .andExpect(jsonPath("$.items[0].doneAt").isNotEmpty());

    putAs(login(createUser(Role.RECRUIT)), itemPath, Map.of("done", true))
        .andExpect(status().isNotFound());
    getAs(managerSession, "/api/recruits/" + recruit.getId() + "/checklists")
        .andExpect(jsonPath("$[0].done").value(1));
  }

  @Test
  void accessRules() throws Exception {
    MockHttpSession manager = login(createUser(Role.MANAGER));
    long templateId = createTemplate(manager);
    User otherRecruit = createUser(Role.RECRUIT, createUser(Role.MANAGER));

    postAs(manager, "/api/recruits/" + otherRecruit.getId() + "/checklists",
            Map.of("templateId", templateId))
        .andExpect(status().isForbidden());
    getAs(login(otherRecruit), "/api/checklist-templates").andExpect(status().isForbidden());
    postAs(manager, "/api/checklist-templates", Map.of("name", "Empty", "items", List.of()))
        .andExpect(status().isBadRequest());
    deleteAs(login(createUser(Role.MANAGER)), "/api/checklist-templates/" + templateId)
        .andExpect(status().isForbidden());
    deleteAs(login(createUser(Role.ADMIN)), "/api/checklist-templates/" + templateId)
        .andExpect(status().isNoContent());
  }
}
