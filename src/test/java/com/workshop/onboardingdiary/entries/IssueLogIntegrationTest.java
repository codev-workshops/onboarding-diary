package com.workshop.onboardingdiary.entries;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
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

/** Issue Log CRUD, field validation and filters (REQUIREMENTS 4.3, 6.1, 6.2, US-R06, US-R07). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class IssueLogIntegrationTest {

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
    private IssueEntryRepository issueEntryRepository;

    private User recruit;
    private String token;

    @BeforeEach
    void setUp() {
        recruit = testUsers.create("issue-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
    }

    @Test
    void createReadUpdateDeleteRoundTripKeepsTheDateFormat() throws Exception {
        String id = objectMapper.readTree(mockMvc.perform(create(validIssue()))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.entryDate").value("2026-02-11"))
                        .andExpect(jsonPath("$.severity").value("HIGH"))
                        .andExpect(jsonPath("$.status").value("OPEN"))
                        .andExpect(jsonPath("$.ownerId").value(recruit.getId()))
                        .andReturn().getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(get("/api/issues/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entryDate").value("2026-02-11"));

        Map<String, Object> updated = validIssue();
        updated.put("status", "RESOLVED");
        updated.put("resolutionNotes", "The VPN client needed a restart");
        mockMvc.perform(put("/api/issues/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNotes").value("The VPN client needed a restart"));

        mockMvc.perform(delete("/api/issues/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertThat(issueEntryRepository.findById(Long.valueOf(id))).isEmpty();
    }

    @Test
    void entryDateIsRequiredValidatedForFormatFutureAndStartDate() throws Exception {
        Map<String, Object> missing = validIssue();
        missing.remove("entryDate");
        mockMvc.perform(create(missing))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date is required"));

        Map<String, Object> wrongFormat = validIssue();
        wrongFormat.put("entryDate", "11-02-2026");
        mockMvc.perform(create(wrongFormat))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").exists());

        Map<String, Object> future = validIssue();
        future.put("entryDate", LocalDate.now().plusDays(3).toString());
        mockMvc.perform(create(future))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be in the future"));

        Map<String, Object> beforeStart = validIssue();
        beforeStart.put("entryDate", "2026-01-04");
        mockMvc.perform(create(beforeStart))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.entryDate").value("Entry date may not be before the start date"));
    }

    @Test
    void titleDescriptionAndResolutionNotesRespectTheirLimits() throws Exception {
        Map<String, Object> blankTitle = validIssue();
        blankTitle.put("title", "");
        mockMvc.perform(create(blankTitle))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());

        Map<String, Object> longTitle = validIssue();
        longTitle.put("title", "x".repeat(151));
        mockMvc.perform(create(longTitle))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").value("Title must be between 1 and 150 characters"));

        Map<String, Object> longDescription = validIssue();
        longDescription.put("description", "x".repeat(5001));
        mockMvc.perform(create(longDescription))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.description").value("Description must be at most 5000 characters"));

        Map<String, Object> longNotes = validIssue();
        longNotes.put("status", "RESOLVED");
        longNotes.put("resolutionNotes", "x".repeat(5001));
        mockMvc.perform(create(longNotes))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.resolutionNotes")
                        .value("Resolution notes must be at most 5000 characters"));

        Map<String, Object> withoutOptionalFields = validIssue();
        withoutOptionalFields.remove("description");
        withoutOptionalFields.remove("resolutionNotes");
        mockMvc.perform(create(withoutOptionalFields)).andExpect(status().isCreated());
    }

    @Test
    void severityAndStatusAcceptOnlyTheirEnumValues() throws Exception {
        for (String severity : new String[] {"LOW", "MEDIUM", "HIGH", "CRITICAL"}) {
            Map<String, Object> body = validIssue();
            body.put("severity", severity);
            mockMvc.perform(create(body)).andExpect(status().isCreated());
        }
        for (String status : new String[] {"OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"}) {
            Map<String, Object> body = validIssue();
            body.put("status", status);
            body.put("resolutionNotes", "Handled");
            mockMvc.perform(create(body)).andExpect(status().isCreated());
        }

        Map<String, Object> badSeverity = validIssue();
        badSeverity.put("severity", "CATASTROPHIC");
        mockMvc.perform(create(badSeverity))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.severity").exists());

        Map<String, Object> badStatus = validIssue();
        badStatus.put("status", "PENDING");
        mockMvc.perform(create(badStatus))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").exists());

        Map<String, Object> missingSeverity = validIssue();
        missingSeverity.remove("severity");
        mockMvc.perform(create(missingSeverity))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.severity").value("Severity is required"));

        Map<String, Object> missingStatus = validIssue();
        missingStatus.remove("status");
        mockMvc.perform(create(missingStatus))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").value("Status is required"));
    }

    @Test
    void resolvedAndClosedIssuesRequireResolutionNotes() throws Exception {
        for (String status : new String[] {"RESOLVED", "CLOSED"}) {
            Map<String, Object> missing = validIssue();
            missing.put("status", status);
            mockMvc.perform(create(missing))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.resolutionNotes")
                            .value("Resolution notes are required when the status is Resolved or Closed"));

            Map<String, Object> blank = validIssue();
            blank.put("status", status);
            blank.put("resolutionNotes", "   ");
            mockMvc.perform(create(blank))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.resolutionNotes").exists());

            Map<String, Object> provided = validIssue();
            provided.put("status", status);
            provided.put("resolutionNotes", "Fixed by IT");
            mockMvc.perform(create(provided)).andExpect(status().isCreated());
        }
    }

    @Test
    void filtersApplyIndividuallyAndCombinedWithAndSemantics() throws Exception {
        testEntries.issue(recruit, LocalDate.of(2026, 2, 1), "Open low", IssueStatus.OPEN, IssueSeverity.LOW);
        testEntries.issue(recruit, LocalDate.of(2026, 3, 1), "Open critical", IssueStatus.OPEN,
                IssueSeverity.CRITICAL);
        testEntries.issue(recruit, LocalDate.of(2026, 4, 1), "Closed critical", IssueStatus.CLOSED,
                IssueSeverity.CRITICAL);

        expectTitles("/api/issues?status=OPEN", "Open critical", "Open low");
        expectTitles("/api/issues?severity=CRITICAL", "Closed critical", "Open critical");
        expectTitles("/api/issues?dateFrom=2026-03-01", "Closed critical", "Open critical");
        expectTitles("/api/issues?dateTo=2026-02-15", "Open low");
        expectTitles("/api/issues?status=OPEN&severity=CRITICAL", "Open critical");
        expectTitles("/api/issues?status=OPEN&severity=CRITICAL&dateFrom=2026-03-02");
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
        return post("/api/issues")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body));
    }

    private Map<String, Object> validIssue() {
        Map<String, Object> body = new HashMap<>();
        body.put("entryDate", "2026-02-11");
        body.put("title", "VPN keeps dropping");
        body.put("description", "Disconnects roughly every ten minutes");
        body.put("severity", "HIGH");
        body.put("status", "OPEN");
        return body;
    }
}
