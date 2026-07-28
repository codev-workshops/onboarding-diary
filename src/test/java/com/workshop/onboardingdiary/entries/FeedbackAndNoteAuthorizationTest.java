package com.workshop.onboardingdiary.entries;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.workshop.onboardingdiary.entity.AdditionalNote;
import com.workshop.onboardingdiary.entity.FeedbackNote;
import com.workshop.onboardingdiary.entity.FeedbackType;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestEntries;
import com.workshop.onboardingdiary.support.TestUsers;
import java.time.LocalDate;
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
 * Ownership, Manager oversight, the recruit-only feedback create rule and authentication for
 * Feedback Notes and Additional Notes (REQUIREMENTS 4.4, 4.5, 6.2). Oversight rows are seeded
 * directly because the admin endpoints that manage assignments (section 4.8) belong to a later
 * phase.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FeedbackAndNoteAuthorizationTest {

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
    private FeedbackNote feedback;
    private AdditionalNote note;
    private String ownerToken;
    private String otherRecruitToken;
    private String overseeingManagerToken;
    private String otherManagerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        owner = testUsers.create("note-authz-owner@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        User otherRecruit = testUsers.create("note-authz-recruit@example.com", "sup3rsecret", Role.NEW_RECRUIT, true);
        User overseeingManager = testUsers.create("note-authz-manager@example.com", "sup3rsecret", Role.MANAGER, true);
        User otherManager = testUsers.create("note-authz-other-manager@example.com", "sup3rsecret", Role.MANAGER,
                true);
        User admin = testUsers.create("note-authz-admin@example.com", "sup3rsecret", Role.ADMIN, true);
        testEntries.assign(overseeingManager, owner);

        feedback = testEntries.feedback(owner, LocalDate.of(2026, 2, 2), "Owned feedback", FeedbackType.POSITIVE);
        note = testEntries.note(owner, LocalDate.of(2026, 2, 3), "Owned note", "office");

        ownerToken = token(owner);
        otherRecruitToken = token(otherRecruit);
        overseeingManagerToken = token(overseeingManager);
        otherManagerToken = token(otherManager);
        adminToken = token(admin);
    }

    @Test
    void unauthenticatedCallersGet401OnEveryFeedbackAndNoteEndpoint() throws Exception {
        mockMvc.perform(get("/api/feedback")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/feedback/" + feedback.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/feedback").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/feedback/" + feedback.getId())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/feedback/" + feedback.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notes")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notes/" + note.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/notes").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/notes/" + note.getId()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/notes/" + note.getId())).andExpect(status().isUnauthorized());
    }

    @Test
    void anInvalidBearerTokenIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/feedback").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notes").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theOwnerCanReadAndWriteTheirOwnFeedbackAndNotes() throws Exception {
        mockMvc.perform(get("/api/feedback/" + feedback.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());
        mockMvc.perform(createFeedback(ownerToken)).andExpect(status().isCreated());
        mockMvc.perform(updateFeedback(ownerToken)).andExpect(status().isOk());
        mockMvc.perform(get("/api/notes/" + note.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk());
        mockMvc.perform(createNote(ownerToken)).andExpect(status().isCreated());
        mockMvc.perform(updateNote(ownerToken)).andExpect(status().isOk());
        mockMvc.perform(delete("/api/feedback/" + feedback.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/notes/" + note.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void aNewRecruitCannotTouchAnotherRecruitsFeedbackOrNotes() throws Exception {
        mockMvc.perform(get("/api/feedback?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/feedback/" + feedback.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateFeedback(otherRecruitToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/feedback/" + feedback.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/notes?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/notes/" + note.getId()).header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateNote(otherRecruitToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/notes/" + note.getId())
                        .header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anOverseeingManagerMayReadButNeverWrite() throws Exception {
        mockMvc.perform(get("/api/feedback?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].subject").value("Owned feedback"));
        mockMvc.perform(get("/api/feedback/" + feedback.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/notes?userId=" + owner.getId() + "&tag=office")
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Owned note"));
        mockMvc.perform(get("/api/notes/" + note.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isOk());

        mockMvc.perform(updateFeedback(overseeingManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/feedback/" + feedback.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateNote(overseeingManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/notes/" + note.getId())
                        .header("Authorization", "Bearer " + overseeingManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void aManagerWithoutAnAssignmentIsForbiddenToReadOrWrite() throws Exception {
        mockMvc.perform(get("/api/feedback?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/feedback/" + feedback.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateFeedback(otherManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/feedback/" + feedback.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/notes?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/notes/" + note.getId()).header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(updateNote(otherManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/notes/" + note.getId())
                        .header("Authorization", "Bearer " + otherManagerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminMayReadAndWriteAnyFeedbackOrNote() throws Exception {
        mockMvc.perform(get("/api/feedback?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/feedback/" + feedback.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(updateFeedback(adminToken)).andExpect(status().isOk());
        mockMvc.perform(get("/api/notes?userId=" + owner.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/notes/" + note.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(updateNote(adminToken)).andExpect(status().isOk());
        mockMvc.perform(delete("/api/feedback/" + feedback.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/notes/" + note.getId()).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void onlyNewRecruitsMayCreateFeedbackWhileEveryRoleMayCreateNotes() throws Exception {
        mockMvc.perform(createFeedback(ownerToken)).andExpect(status().isCreated());
        mockMvc.perform(createFeedback(overseeingManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(createFeedback(otherManagerToken)).andExpect(status().isForbidden());
        mockMvc.perform(createFeedback(adminToken)).andExpect(status().isForbidden());

        mockMvc.perform(createNote(overseeingManagerToken)).andExpect(status().isCreated());
        mockMvc.perform(createNote(adminToken)).andExpect(status().isCreated());
    }

    @Test
    void listsDefaultToTheCallerAndPassingTheOwnIdIsAlwaysAllowed() throws Exception {
        mockMvc.perform(get("/api/feedback").header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/notes").header("Authorization", "Bearer " + otherRecruitToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/feedback?userId=" + owner.getId())
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/notes?userId=" + owner.getId()).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    private RequestBuilder createFeedback(String token) throws Exception {
        return post("/api/feedback")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "entryDate", "2026-02-04",
                        "subject", "A new feedback note",
                        "type", "SUGGESTION",
                        "details", "The first week could include a tools overview")));
    }

    private RequestBuilder updateFeedback(String token) throws Exception {
        return put("/api/feedback/" + feedback.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "entryDate", "2026-02-02",
                        "subject", "Edited feedback",
                        "type", "CONCERN",
                        "details", "Edited details")));
    }

    private RequestBuilder createNote(String token) throws Exception {
        return post("/api/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "entryDate", "2026-02-04",
                        "title", "A new note",
                        "content", "Something worth remembering",
                        "tags", List.of("misc"))));
    }

    private RequestBuilder updateNote(String token) throws Exception {
        return put("/api/notes/" + note.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "entryDate", "2026-02-03",
                        "title", "Edited note",
                        "content", "Edited content",
                        "tags", List.of("office", "edited"))));
    }

    private String token(User user) {
        return jwtService.issueToken(user.getEmail(), user.getRole());
    }
}
