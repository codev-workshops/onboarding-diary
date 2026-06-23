package com.onboardingdiary.controller;

import com.onboardingdiary.entity.*;
import com.onboardingdiary.entity.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.ManagerRecruitAssignmentRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruits")
public class RecruitDataController {

    private final TaskEntryService taskEntryService;
    private final IssueEntryService issueEntryService;
    private final FeedbackEntryService feedbackEntryService;
    private final NoteEntryService noteEntryService;
    private final UserRepository userRepository;
    private final ManagerRecruitAssignmentRepository assignmentRepository;

    public RecruitDataController(TaskEntryService taskEntryService,
                                  IssueEntryService issueEntryService,
                                  FeedbackEntryService feedbackEntryService,
                                  NoteEntryService noteEntryService,
                                  UserRepository userRepository,
                                  ManagerRecruitAssignmentRepository assignmentRepository) {
        this.taskEntryService = taskEntryService;
        this.issueEntryService = issueEntryService;
        this.feedbackEntryService = feedbackEntryService;
        this.noteEntryService = noteEntryService;
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
    }

    @GetMapping("/{recruitId}/tasks")
    public ResponseEntity<List<TaskEntry>> getRecruitTasks(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long recruitId) {
        verifyAccess(userDetails, recruitId);
        return ResponseEntity.ok(taskEntryService.getByUser(recruitId, null, null, null, null));
    }

    @GetMapping("/{recruitId}/issues")
    public ResponseEntity<List<IssueEntry>> getRecruitIssues(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long recruitId) {
        verifyAccess(userDetails, recruitId);
        return ResponseEntity.ok(issueEntryService.getByUser(recruitId, null, null, null, null));
    }

    @GetMapping("/{recruitId}/feedback")
    public ResponseEntity<List<FeedbackEntry>> getRecruitFeedback(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long recruitId) {
        verifyAccess(userDetails, recruitId);
        return ResponseEntity.ok(feedbackEntryService.getByUser(recruitId, null, null, null));
    }

    @GetMapping("/{recruitId}/notes")
    public ResponseEntity<List<NoteEntry>> getRecruitNotes(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long recruitId) {
        verifyAccess(userDetails, recruitId);
        return ResponseEntity.ok(noteEntryService.getByUser(recruitId, null, null, null));
    }

    private void verifyAccess(UserDetails userDetails, Long recruitId) {
        User currentUser = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (currentUser.getRole() == Role.ADMIN) {
            return;
        }

        if (currentUser.getRole() == Role.MANAGER) {
            if (!assignmentRepository.existsByManagerIdAndRecruitId(currentUser.getId(), recruitId)) {
                throw new UnauthorizedException("You don't have access to this recruit's data");
            }
            return;
        }

        throw new UnauthorizedException("Access denied");
    }
}
