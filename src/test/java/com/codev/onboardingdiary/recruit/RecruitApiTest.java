package com.codev.onboardingdiary.recruit;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codev.onboardingdiary.support.ApiTestSupport;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class RecruitApiTest extends ApiTestSupport {

  private static final Map<String, Object> DONE_TASK =
      Map.of(
          "entryDate", LocalDate.now().toString(), "title", "Done", "category", "SETUP",
          "status", "DONE", "priority", "LOW");

  @Test
  void managerSeesOnlyAssignedRecruitsReadOnly() throws Exception {
    User manager = createUser(Role.MANAGER);
    User mine = createUser(Role.RECRUIT, manager);
    User notMine = createUser(Role.RECRUIT, createUser(Role.MANAGER));
    postAs(login(mine), "/api/tasks", DONE_TASK).andExpect(status().isCreated());
    MockHttpSession session = login(manager);

    getAs(session, "/api/recruits")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElements").value(1))
        .andExpect(jsonPath("$.content[0].id").value(mine.getId()))
        .andExpect(jsonPath("$.content[0].taskPercent").value(100.0))
        .andExpect(jsonPath("$.content[0].openIssues").value(0));
    getAs(session, "/api/recruits/" + mine.getId() + "/tasks")
        .andExpect(jsonPath("$.totalElements").value(1));
    getAs(session, "/api/recruits/" + mine.getId() + "/dashboard")
        .andExpect(jsonPath("$.taskProgress.done").value(1));
    for (String path : new String[] {"", "/dashboard", "/tasks", "/issues", "/feedback", "/notes"}) {
      getAs(session, "/api/recruits/" + notMine.getId() + path).andExpect(status().isForbidden());
    }
    postAs(session, "/api/recruits/" + mine.getId() + "/tasks", DONE_TASK)
        .andExpect(status().isMethodNotAllowed());
  }

  @Test
  void adminSeesAnyRecruitButNonRecruitIdsAre404() throws Exception {
    User recruit = createUser(Role.RECRUIT);
    User manager = createUser(Role.MANAGER);
    MockHttpSession admin = login(createUser(Role.ADMIN));

    getAs(admin, "/api/recruits/" + recruit.getId()).andExpect(status().isOk());
    getAs(admin, "/api/recruits/" + recruit.getId() + "/notes").andExpect(status().isOk());
    getAs(admin, "/api/recruits/" + manager.getId()).andExpect(status().isNotFound());
    getAs(admin, "/api/recruits?q=" + recruit.getEmail().substring(0, 20))
        .andExpect(jsonPath("$.totalElements").value(1));
  }

  @Test
  void recruitsCannotUseOversightEndpoints() throws Exception {
    User recruit = createUser(Role.RECRUIT);
    getAs(login(recruit), "/api/recruits/" + recruit.getId()).andExpect(status().isForbidden());
  }

  @Test
  void reassignedRecruitBecomesInvisibleToFormerManager() throws Exception {
    User manager = createUser(Role.MANAGER);
    User recruit = createUser(Role.RECRUIT, manager);
    MockHttpSession session = login(manager);
    getAs(session, "/api/recruits/" + recruit.getId()).andExpect(status().isOk());

    recruit.setManager(createUser(Role.MANAGER));
    userRepository.save(recruit);
    getAs(session, "/api/recruits/" + recruit.getId()).andExpect(status().isForbidden());
  }
}
