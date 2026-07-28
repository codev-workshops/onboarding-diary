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
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.AdditionalNoteRepository;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
 * Additional Note CRUD, field validation, tag normalisation and filters
 * (REQUIREMENTS 4.5, 6.1, 6.2, US-R09).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdditionalNoteIntegrationTest {

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
    private AdditionalNoteRepository additionalNoteRepository;

    private User recruit;
    private String token;

    @BeforeEach
    void setUp() {
        recruit = testUsers.create("note-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
    }

    @Test
    void createReadUpdateDeleteRoundTripKeepsTheDateFormatAndTags() throws Exception {
        String id = objectMapper.readTree(mockMvc.perform(create(validNote()))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.entryDate").value("2026-02-10"))
                        .andExpect(jsonPath("$.title").value("Coffee machine tips"))
                        .andExpect(jsonPath("$.content").value("The second floor machine needs a card"))
                        .andExpect(jsonPath("$.tags.length()").value(2))
                        .andExpect(jsonPath("$.tags[0]").value("office"))
                        .andExpect(jsonPath("$.tags[1]").value("tips"))
                        .andExpect(jsonPath("$.ownerId").value(recruit.getId()))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/notes/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entryDate").value("2026-02-10"))
                .andExpect(jsonPath("$.tags.length()").value(2));

        Map<String, Object> updated = validNote();
        updated.put("title", "Coffee machine tips (updated)");
        updated.put("tags", List.of("Kitchen"));
        mockMvc.perform(put("/api/notes/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Coffee machine tips (updated)"))
                .andExpect(jsonPath("$.tags.length()").value(1))
                .andExpect(jsonPath("$.tags[0]").value("kitchen"));

        mockMvc.perform(delete("/api/notes/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertThat(additionalNoteRepository.findById(Long.valueOf(id))).isEmpty();
    }

    @Test
    void listReturnsTheOwnNotesNewestFirst() throws Exception {
        testEntries.note(recruit, LocalDate.of(2026, 2, 1), "Older", "office");
        testEntries.note(recruit, LocalDate.of(2026, 3, 1), "Newer", "office");

        mockMvc.perform(get("/api/notes").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Newer"))
                .andExpect(jsonPath("$[1].title").value("Older"));
    }

    @Test
    void entryDateIsRequiredAndMustBeAnIsoDate() throws Exception {
        Map<String, Object> missing = validNote();
        missing.remove("entryDate");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date is required"));

        Map<String, Object> wrongFormat = validNote();
        wrongFormat.put("entryDate", "10/02/2026");
        mockMvc.perform(create(wrongFormat))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").exists());
    }

    @Test
    void entryDateMayNotBeInTheFutureOrBeforeTheOwnersStartDate() throws Exception {
        Map<String, Object> future = validNote();
        future.put("entryDate", LocalDate.now().plusDays(1).toString());
        mockMvc.perform(create(future))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be in the future"));

        Map<String, Object> beforeStart = validNote();
        beforeStart.put("entryDate", "2025-12-31");
        mockMvc.perform(create(beforeStart))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be before the start date"));
    }

    @Test
    void titleIsRequiredAndLimitedTo150Characters() throws Exception {
        Map<String, Object> missing = validNote();
        missing.remove("title");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").value("Title is required"));

        Map<String, Object> blank = validNote();
        blank.put("title", " ");
        mockMvc.perform(create(blank))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());

        Map<String, Object> tooLong = validNote();
        tooLong.put("title", "x".repeat(151));
        mockMvc.perform(create(tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title")
                        .value("Title must be between 1 and 150 characters"));

        Map<String, Object> atLimit = validNote();
        atLimit.put("title", "x".repeat(150));
        mockMvc.perform(create(atLimit)).andExpect(status().isCreated());
    }

    @Test
    void contentIsRequiredAndLimitedTo10000Characters() throws Exception {
        Map<String, Object> missing = validNote();
        missing.remove("content");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content").value("Content is required"));

        Map<String, Object> tooLong = validNote();
        tooLong.put("content", "x".repeat(10001));
        mockMvc.perform(create(tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content")
                        .value("Content must be between 1 and 10000 characters"));

        Map<String, Object> atLimit = validNote();
        atLimit.put("content", "x".repeat(10000));
        mockMvc.perform(create(atLimit)).andExpect(status().isCreated());
    }

    @Test
    void tagsAreOptionalAndLimitedInLength() throws Exception {
        Map<String, Object> withoutTags = validNote();
        withoutTags.remove("tags");
        mockMvc.perform(create(withoutTags))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags.length()").value(0));

        Map<String, Object> emptyTags = validNote();
        emptyTags.put("tags", List.of());
        mockMvc.perform(create(emptyTags))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags.length()").value(0));

        Map<String, Object> blankTag = validNote();
        blankTag.put("tags", List.of("  "));
        mockMvc.perform(create(blankTag))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.tags")
                        .value("Each tag must be between 1 and 30 characters"));

        Map<String, Object> tooLongTag = validNote();
        tooLongTag.put("tags", List.of("x".repeat(31)));
        mockMvc.perform(create(tooLongTag))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.tags")
                        .value("Each tag must be between 1 and 30 characters"));

        Map<String, Object> atLimit = validNote();
        atLimit.put("tags", List.of("x".repeat(30)));
        mockMvc.perform(create(atLimit))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags[0]").value("x".repeat(30)));
    }

    @Test
    void atMostTenTagsAreAccepted() throws Exception {
        List<String> ten = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            ten.add("tag" + i);
        }
        Map<String, Object> atLimit = validNote();
        atLimit.put("tags", ten);
        mockMvc.perform(create(atLimit))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags.length()").value(10));

        List<String> eleven = new ArrayList<>(ten);
        eleven.add("tag10");
        Map<String, Object> tooMany = validNote();
        tooMany.put("tags", eleven);
        mockMvc.perform(create(tooMany))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.tags").value("At most 10 tags are allowed"));
    }

    @Test
    void tagsAreTrimmedLowerCasedAndDeduplicatedBeforeSaving() throws Exception {
        Map<String, Object> body = validNote();
        body.put("tags", List.of("  Office ", "OFFICE", "office", "Onboarding  "));
        mockMvc.perform(create(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags.length()").value(2))
                .andExpect(jsonPath("$.tags[0]").value("office"))
                .andExpect(jsonPath("$.tags[1]").value("onboarding"));
    }

    @Test
    void tagSearchMatchesTheNormalisedTagWhateverTheCallerTypes() throws Exception {
        testEntries.note(recruit, LocalDate.of(2026, 2, 1), "Office note", "office");
        testEntries.note(recruit, LocalDate.of(2026, 3, 1), "Kitchen note", "kitchen");

        expectTitles("/api/notes?tag=office", "Office note");
        expectTitles("/api/notes?tag=OFFICE", "Office note");
        expectTitlesForTag("  Office ", "Office note");
        expectTitles("/api/notes?tag=gardening");
        expectTitles("/api/notes?tag=", "Kitchen note", "Office note");
    }

    @Test
    void filtersApplyIndividuallyAndCombinedWithAndSemantics() throws Exception {
        testEntries.note(recruit, LocalDate.of(2026, 2, 1), "February office", "office");
        testEntries.note(recruit, LocalDate.of(2026, 3, 1), "March kitchen", "kitchen");
        testEntries.note(recruit, LocalDate.of(2026, 4, 1), "April office", "office");

        expectTitles("/api/notes?dateFrom=2026-03-01", "April office", "March kitchen");
        expectTitles("/api/notes?dateTo=2026-03-01", "March kitchen", "February office");
        expectTitles("/api/notes?dateFrom=2026-02-15&dateTo=2026-03-15", "March kitchen");
        expectTitles("/api/notes?tag=office&dateFrom=2026-03-15", "April office");
    }

    private void expectTitlesForTag(String tag, String... titles) throws Exception {
        var result = mockMvc.perform(get("/api/notes")
                        .param("tag", tag)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(titles.length));
        for (int i = 0; i < titles.length; i++) {
            result.andExpect(jsonPath("$[" + i + "].title").value(titles[i]));
        }
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
        return post("/api/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
    }

    private Map<String, Object> validNote() {
        Map<String, Object> body = new HashMap<>();
        body.put("entryDate", "2026-02-10");
        body.put("title", "Coffee machine tips");
        body.put("content", "The second floor machine needs a card");
        body.put("tags", List.of("Office", " tips "));
        return body;
    }
}
