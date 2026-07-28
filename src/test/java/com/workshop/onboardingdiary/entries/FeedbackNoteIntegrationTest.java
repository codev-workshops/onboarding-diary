package com.workshop.onboardingdiary.entries;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workshop.onboardingdiary.entity.FeedbackType;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.FeedbackNoteRepository;
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

/** Feedback Note CRUD, field validation and filters (REQUIREMENTS 4.4, 6.1, 6.2, US-R08). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FeedbackNoteIntegrationTest {

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
    private FeedbackNoteRepository feedbackNoteRepository;

    private User recruit;
    private String token;

    @BeforeEach
    void setUp() {
        recruit = testUsers.create("feedback-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
    }

    @Test
    void createReadUpdateDeleteRoundTripKeepsTheDateFormat() throws Exception {
        String id = objectMapper.readTree(mockMvc.perform(create(validFeedback()))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.entryDate").value("2026-02-10"))
                        .andExpect(jsonPath("$.subject").value("Great buddy programme"))
                        .andExpect(jsonPath("$.type").value("POSITIVE"))
                        .andExpect(jsonPath("$.details").value("My buddy answered every question quickly"))
                        .andExpect(jsonPath("$.ownerId").value(recruit.getId()))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/feedback/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entryDate").value("2026-02-10"));

        Map<String, Object> updated = validFeedback();
        updated.put("subject", "Buddy programme could start earlier");
        updated.put("type", "SUGGESTION");
        mockMvc.perform(put("/api/feedback/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject").value("Buddy programme could start earlier"))
                .andExpect(jsonPath("$.type").value("SUGGESTION"));

        mockMvc.perform(delete("/api/feedback/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertThat(feedbackNoteRepository.findById(Long.valueOf(id))).isEmpty();
    }

    @Test
    void listReturnsTheOwnFeedbackNewestFirst() throws Exception {
        testEntries.feedback(recruit, LocalDate.of(2026, 2, 1), "Older", FeedbackType.POSITIVE);
        testEntries.feedback(recruit, LocalDate.of(2026, 3, 1), "Newer", FeedbackType.CONCERN);

        mockMvc.perform(get("/api/feedback").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].subject").value("Newer"))
                .andExpect(jsonPath("$[1].subject").value("Older"));
    }

    @Test
    void entryDateIsRequiredAndMustBeAnIsoDate() throws Exception {
        Map<String, Object> missing = validFeedback();
        missing.remove("entryDate");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date is required"));

        Map<String, Object> wrongFormat = validFeedback();
        wrongFormat.put("entryDate", "10/02/2026");
        mockMvc.perform(create(wrongFormat))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").exists());
    }

    @Test
    void entryDateMayNotBeInTheFutureOrBeforeTheOwnersStartDate() throws Exception {
        Map<String, Object> future = validFeedback();
        future.put("entryDate", LocalDate.now().plusDays(1).toString());
        mockMvc.perform(create(future))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be in the future"));

        Map<String, Object> beforeStart = validFeedback();
        beforeStart.put("entryDate", "2025-12-31");
        mockMvc.perform(create(beforeStart))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be before the start date"));
    }

    @Test
    void subjectIsRequiredAndLimitedTo150Characters() throws Exception {
        Map<String, Object> blank = validFeedback();
        blank.put("subject", " ");
        mockMvc.perform(create(blank))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.subject").exists());

        Map<String, Object> missing = validFeedback();
        missing.remove("subject");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.subject").value("Subject is required"));

        Map<String, Object> tooLong = validFeedback();
        tooLong.put("subject", "x".repeat(151));
        mockMvc.perform(create(tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.subject")
                        .value("Subject must be between 1 and 150 characters"));

        Map<String, Object> atLimit = validFeedback();
        atLimit.put("subject", "x".repeat(150));
        mockMvc.perform(create(atLimit)).andExpect(status().isCreated());
    }

    @Test
    void detailsAreRequiredAndLimitedTo5000Characters() throws Exception {
        Map<String, Object> missing = validFeedback();
        missing.remove("details");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.details").value("Details are required"));

        Map<String, Object> blank = validFeedback();
        blank.put("details", "  ");
        mockMvc.perform(create(blank))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.details").exists());

        Map<String, Object> tooLong = validFeedback();
        tooLong.put("details", "x".repeat(5001));
        mockMvc.perform(create(tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.details")
                        .value("Details must be between 1 and 5000 characters"));

        Map<String, Object> atLimit = validFeedback();
        atLimit.put("details", "x".repeat(5000));
        mockMvc.perform(create(atLimit)).andExpect(status().isCreated());
    }

    @Test
    void typeAcceptsOnlyItsEnumValues() throws Exception {
        for (String type : new String[] {"POSITIVE", "SUGGESTION", "CONCERN"}) {
            Map<String, Object> body = validFeedback();
            body.put("type", type);
            mockMvc.perform(create(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.type").value(type));
        }

        Map<String, Object> unknown = validFeedback();
        unknown.put("type", "COMPLAINT");
        mockMvc.perform(create(unknown))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.type").exists());

        Map<String, Object> missing = validFeedback();
        missing.remove("type");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.type").value("Type is required"));
    }

    @Test
    void unknownTypeFilterIsRejected() throws Exception {
        mockMvc.perform(get("/api/feedback?type=COMPLAINT").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.type").exists());
    }

    @Test
    void filtersApplyIndividuallyAndCombinedWithAndSemantics() throws Exception {
        testEntries.feedback(recruit, LocalDate.of(2026, 2, 1), "Positive February", FeedbackType.POSITIVE);
        testEntries.feedback(recruit, LocalDate.of(2026, 3, 1), "Suggestion March", FeedbackType.SUGGESTION);
        testEntries.feedback(recruit, LocalDate.of(2026, 4, 1), "Positive April", FeedbackType.POSITIVE);

        expectSubjects("/api/feedback?type=POSITIVE", "Positive April", "Positive February");
        expectSubjects("/api/feedback?type=CONCERN");
        expectSubjects("/api/feedback?dateFrom=2026-03-01", "Positive April", "Suggestion March");
        expectSubjects("/api/feedback?dateTo=2026-03-01", "Suggestion March", "Positive February");
        expectSubjects("/api/feedback?dateFrom=2026-02-15&dateTo=2026-03-15", "Suggestion March");
        expectSubjects("/api/feedback?type=POSITIVE&dateFrom=2026-03-15", "Positive April");
    }

    private void expectSubjects(String url, String... subjects) throws Exception {
        var result = mockMvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(subjects.length));
        for (int i = 0; i < subjects.length; i++) {
            result.andExpect(jsonPath("$[" + i + "].subject").value(subjects[i]));
        }
    }

    private RequestBuilder create(Map<String, Object> body) throws Exception {
        return post("/api/feedback")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
    }

    private Map<String, Object> validFeedback() {
        Map<String, Object> body = new HashMap<>();
        body.put("entryDate", "2026-02-10");
        body.put("subject", "Great buddy programme");
        body.put("type", "POSITIVE");
        body.put("details", "My buddy answered every question quickly");
        return body;
    }
}
