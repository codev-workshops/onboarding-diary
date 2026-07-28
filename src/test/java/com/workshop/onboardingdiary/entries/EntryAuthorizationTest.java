package com.workshop.onboardingdiary.entries;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.TaskEntry;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ownership, Manager oversight and authentication for the Task and Issue logs
 * (REQUIREMENTS 4.2, 4.3, 6.2). Oversight rows are seeded directly because the admin endpoints
 * that manage assignments (section 4.8) belong to a later phase.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EntryAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    @Autowired
    private TestEntries testEntries;

    private User owner;
    private TaskEntry task;
    private IssueEntry issue;
    private String ownerToken;
    private String otherRecruitToken;
    private String overseeingManagerToken;
    private String otherManagerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        owner = testUsers.create("owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        User otherRecruit = testUsers.create("other-recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        User overseeingManager = testUsers.create("manager@example.com", "sup3rsecret", Role.MANAGER, true);
        User otherManager = testUsers.create("other-manager@example.com", "sup3rsecret", Role.MANAGER, true);
        User admin = testUsers.create("admin@example.com", "sup3rsecret", Role.ADMIN, true);
        testEntries.assign(overseeingManager, owner);

        task = testEntries.task(owner, LocalDate.of(2026, 2, 2), "Owned task", "Development",
                TaskStatus.IN_PROGRESS);
        issue = testEntries.issue(owner, LocalDate.of(2026, 2, 3), "Owned issue", IssueStatus.OPEN,
                IssueSeverity.LOW);

        ownerToken = token(owner);
        otherRecruitToken = token(otherRecruit);
        overseeingManagerToken = token(overseeingManager);
        otherManagerToken = token(otherManager);
        adminToken = token(admin);
    }

    @Test
    void unauthenticatedCallersGet401OnEveryEntryEndpoint() throws Exception {
        mockMvc.perform(get("/api/tasks")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/tasks/" + task.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/tasks/" + task.getId()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/tasks/" + task.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/issues")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/issues/" + issue.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/issues").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/issues/" + issue.getId()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/issues/" + issue.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/categories")).andExpect(status().isUnauthorized());
    }

    @Test
    void theOwnerCanReadAndWriteTheirOwnEntries() throws Exception {
        mockMvc.perform(get("/api/tasks/" + task.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());
        mockMvc.perform(createTask(ownerToken)).andExpect(status().isCreated());
        mockMvc.perform(updateTask(ownerToken)).andExpect(status().isOk());
        mockMvc.perform(get("/api/issues/" + issue.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());
        mockMvc.perform(updateIssue(ownerToken)).andExpect(status().isOk());
        mockMvc.perform(delete("/api/tasks/" + task.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/issues/" + issue.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void aNewRecruitCannotTouchAnotherRecruitsEntries() throws Exception {
        mockMvc.perform(get("/api/tasks?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/tasks/" + task.getId()).header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateTask(otherRecruitToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/tasks/" + task.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/issues?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/issues/" + issue.getId()).header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateIssue(otherRecruitToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/issues/" + issue.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anOverseeingManagerMayReadButNeverWrite() throws Exception {
        mockMvc.perform(get("/api/tasks?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Owned task"));
        mockMvc.perform(get("/api/tasks/" + task.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/issues?userId=" + owner.getId() + "&status=OPEN")
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Owned issue"));
        mockMvc.perform(get("/api/issues/" + issue.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk());

        mockMvc.perform(updateTask(overseeingManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/tasks/" + task.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateIssue(overseeingManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/issues/" + issue.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void aManagerWithoutAnAssignmentIsForbiddenToReadOrWrite() throws Exception {
        mockMvc.perform(get("/api/tasks?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/tasks/" + task.getId()).header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateTask(otherManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/tasks/" + task.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/issues?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/issues/" + issue.getId()).header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateIssue(otherManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/issues/" + issue.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminMayReadAndWriteAnyEntry() throws Exception {
        mockMvc.perform(get("/api/tasks?userId=" + owner.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/tasks/" + task.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(updateTask(adminToken)).andExpect(status().isOk());
        mockMvc.perform(get("/api/issues?userId=" + owner.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(updateIssue(adminToken)).andExpect(status().isOk());
        mockMvc.perform(delete("/api/tasks/" + task.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/issues/" + issue.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void listsDefaultToTheCallerAndPassingTheOwnIdIsAlwaysAllowed() throws Exception {
        mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/tasks?userId=" + owner.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    private RequestBuilder createTask(String token) throws Exception {
        return post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "entryDate", "2026-02-04",
                        "title", "A new task",
                        "category", "Development",
                        "status", "NOT_STARTED",
                        "priority", "LOW")));
    }

    private RequestBuilder updateTask(String token) throws Exception {
        return put("/api/tasks/" + task.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "entryDate", "2026-02-02",
                        "title", "Edited task",
                        "category", "Development",
                        "status", "COMPLETED",
                        "priority", "HIGH")));
    }

    private RequestBuilder updateIssue(String token) throws Exception {
        return put("/api/issues/" + issue.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "entryDate", "2026-02-03",
                        "title", "Edited issue",
                        "severity", "MEDIUM",
                        "status", "OPEN")));
    }

    private String token(User user) {
        return jwtService.issueToken(user.getEmail(), user.getRole());
    }
}
