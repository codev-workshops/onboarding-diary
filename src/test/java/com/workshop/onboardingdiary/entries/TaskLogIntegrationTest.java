package com.workshop.onboardingdiary.entries;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.TaskCategoryRepository;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import java.time.LocalDate;
import java.util.HashMap;
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

/** Task Log CRUD, field validation and filters (REQUIREMENTS 4.2, 6.1, 6.2, US-R04, US-R05). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TaskLogIntegrationTest {

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

    @Autowired
    private TaskEntryRepository taskEntryRepository;

    @Autowired
    private TaskCategoryRepository taskCategoryRepository;

    private User recruit;
    private String token;

    @BeforeEach
    void setUp() {
        recruit = testUsers.create("task-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
    }

    @Test
    void createReadUpdateDeleteRoundTripKeepsTheDateFormat() throws Exception {
        String id = objectMapper.readTree(mockMvc.perform(create(validTask()))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.entryDate").value("2026-02-10"))
                        .andExpect(jsonPath("$.title").value("Read the onboarding handbook"))
                        .andExpect(jsonPath("$.category").value("Documentation"))
                        .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                        .andExpect(jsonPath("$.priority").value("HIGH"))
                        .andExpect(jsonPath("$.ownerId").value(recruit.getId()))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/tasks/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entryDate").value("2026-02-10"));

        Map<String, Object> updated = validTask();
        updated.put("title", "Finished the handbook");
        updated.put("status", "COMPLETED");
        mockMvc.perform(put("/api/tasks/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Finished the handbook"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(delete("/api/tasks/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertThat(taskEntryRepository.findById(Long.valueOf(id))).isEmpty();
    }

    @Test
    void listReturnsTheOwnTasksNewestFirst() throws Exception {
        testEntries.task(recruit, LocalDate.of(2026, 2, 1), "Older", "Development", TaskStatus.NOT_STARTED);
        testEntries.task(recruit, LocalDate.of(2026, 3, 1), "Newer", "Development", TaskStatus.COMPLETED);

        mockMvc.perform(get("/api/tasks").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Newer"))
                .andExpect(jsonPath("$[1].title").value("Older"));
    }

    @Test
    void entryDateIsRequiredAndMustBeAnIsoDate() throws Exception {
        Map<String, Object> missing = validTask();
        missing.remove("entryDate");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date is required"));

        Map<String, Object> wrongFormat = validTask();
        wrongFormat.put("entryDate", "10/02/2026");
        mockMvc.perform(create(wrongFormat))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").exists());
    }

    @Test
    void entryDateMayNotBeInTheFutureOrBeforeTheOwnersStartDate() throws Exception {
        Map<String, Object> future = validTask();
        future.put("entryDate", LocalDate.now().plusDays(1).toString());
        mockMvc.perform(create(future))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be in the future"));

        Map<String, Object> beforeStart = validTask();
        beforeStart.put("entryDate", "2025-12-31");
        mockMvc.perform(create(beforeStart))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be before the start date"));
    }

    @Test
    void titleIsRequiredAndLimitedTo150Characters() throws Exception {
        Map<String, Object> blank = validTask();
        blank.put("title", " ");
        mockMvc.perform(create(blank))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());

        Map<String, Object> tooLong = validTask();
        tooLong.put("title", "x".repeat(151));
        mockMvc.perform(create(tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title")
                        .value("Title must be between 1 and 150 characters"));

        Map<String, Object> atLimit = validTask();
        atLimit.put("title", "x".repeat(150));
        mockMvc.perform(create(atLimit)).andExpect(status().isCreated());
    }

    @Test
    void descriptionIsOptionalButLimitedTo5000Characters() throws Exception {
        Map<String, Object> withoutDescription = validTask();
        withoutDescription.remove("description");
        mockMvc.perform(create(withoutDescription)).andExpect(status().isCreated());

        Map<String, Object> tooLong = validTask();
        tooLong.put("description", "x".repeat(5001));
        mockMvc.perform(create(tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.description")
                        .value("Description must be at most 5000 characters"));
    }

    @Test
    void statusAndPriorityAcceptOnlyTheirEnumValues() throws Exception {
        for (String status : new String[] {"NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED"}) {
            Map<String, Object> body = validTask();
            body.put("status", status);
            mockMvc.perform(create(body)).andExpect(status().isCreated());
        }
        for (String priority : new String[] {"LOW", "MEDIUM", "HIGH"}) {
            Map<String, Object> body = validTask();
            body.put("priority", priority);
            mockMvc.perform(create(body)).andExpect(status().isCreated());
        }

        Map<String, Object> badStatus = validTask();
        badStatus.put("status", "ALMOST_DONE");
        mockMvc.perform(create(badStatus))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").exists());

        Map<String, Object> badPriority = validTask();
        badPriority.put("priority", "URGENT");
        mockMvc.perform(create(badPriority))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.priority").exists());

        Map<String, Object> missingStatus = validTask();
        missingStatus.remove("status");
        mockMvc.perform(create(missingStatus))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").value("Status is required"));

        Map<String, Object> missingPriority = validTask();
        missingPriority.remove("priority");
        mockMvc.perform(create(missingPriority))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.priority").value("Priority is required"));
    }

    @Test
    void categoryMustBeKnownActiveAndIsMatchedCaseInsensitively() throws Exception {
        Map<String, Object> missing = validTask();
        missing.remove("category");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.category").value("Category is required"));

        Map<String, Object> unknown = validTask();
        unknown.put("category", "Gardening");
        mockMvc.perform(create(unknown))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.category").value("Unknown category"));

        Map<String, Object> lowerCase = validTask();
        lowerCase.put("category", "development");
        mockMvc.perform(create(lowerCase))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("Development"));

        var support = taskCategoryRepository.findByNameIgnoreCase("Support").orElseThrow();
        support.setActive(false);
        taskCategoryRepository.save(support);
        Map<String, Object> inactive = validTask();
        inactive.put("category", "Support");
        mockMvc.perform(create(inactive))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.category").value("Category is not active"));
    }

    @Test
    void aTaskKeepingItsDeactivatedCategoryCanStillBeEdited() throws Exception {
        var task = testEntries.task(recruit, LocalDate.of(2026, 2, 1), "Support call", "Support",
                TaskStatus.IN_PROGRESS);
        var support = taskCategoryRepository.findByNameIgnoreCase("Support").orElseThrow();
        support.setActive(false);
        taskCategoryRepository.save(support);

        Map<String, Object> unchangedCategory = validTask();
        unchangedCategory.put("category", "Support");
        unchangedCategory.put("status", "COMPLETED");
        mockMvc.perform(put("/api/tasks/" + task.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unchangedCategory)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("Support"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        var training = taskCategoryRepository.findByNameIgnoreCase("Training").orElseThrow();
        training.setActive(false);
        taskCategoryRepository.save(training);
        Map<String, Object> switchToInactive = validTask();
        switchToInactive.put("category", "Training");
        mockMvc.perform(put("/api/tasks/" + task.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(switchToInactive)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.category").value("Category is not active"));
    }

    @Test
    void filtersApplyIndividuallyAndCombinedWithAndSemantics() throws Exception {
        testEntries.task(recruit, LocalDate.of(2026, 2, 1), "Dev in progress", "Development",
                TaskStatus.IN_PROGRESS);
        testEntries.task(recruit, LocalDate.of(2026, 3, 1), "Docs completed", "Documentation",
                TaskStatus.COMPLETED);
        testEntries.task(recruit, LocalDate.of(2026, 4, 1), "Dev completed", "Development", TaskStatus.COMPLETED);

        expectTitles("/api/tasks?dateFrom=2026-03-01", "Dev completed", "Docs completed");
        expectTitles("/api/tasks?dateTo=2026-03-01", "Docs completed", "Dev in progress");
        expectTitles("/api/tasks?dateFrom=2026-02-15&dateTo=2026-03-15", "Docs completed");
        expectTitles("/api/tasks?category=Development", "Dev completed", "Dev in progress");
        expectTitles("/api/tasks?status=COMPLETED", "Dev completed", "Docs completed");
        expectTitles("/api/tasks?category=Development&status=COMPLETED&dateFrom=2026-01-01", "Dev completed");
        expectTitles("/api/tasks?status=BLOCKED");
    }

    private void expectTitles(String url, String... titles) throws Exception {
        var result = mockMvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(titles.length));
        for (int i = 0; i < titles.length; i++) {
            result.andExpect(jsonPath("$[" + i + "].title").value(titles[i]));
        }
    }

    private RequestBuilder create(Map<String, Object> body) throws Exception {
        return post("/api/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
    }

    private Map<String, Object> validTask() {
        Map<String, Object> body = new HashMap<>();
        body.put("entryDate", "2026-02-10");
        body.put("title", "Read the onboarding handbook");
        body.put("description", "Skimmed the first three chapters");
        body.put("category", "Documentation");
        body.put("status", "IN_PROGRESS");
        body.put("priority", "HIGH");
        return body;
    }
}
