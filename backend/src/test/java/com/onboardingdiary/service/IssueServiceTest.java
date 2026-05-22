package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.IssueRequest;
import com.onboardingdiary.dto.response.IssueResponse;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.IssueSeverity;
import com.onboardingdiary.enums.IssueStatus;
import com.onboardingdiary.enums.Role;
import com.onboardingdiary.exception.BadRequestException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IssueServiceTest {

    @Mock
    private IssueRepository issueRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private IssueService issueService;

    private User user;
    private User manager;
    private Issue issue;

    @BeforeEach
    void setUp() {
        manager = User.builder()
                .id(UUID.randomUUID())
                .role(Role.MANAGER)
                .build();

        user = User.builder()
                .id(UUID.randomUUID())
                .email("recruit@test.com")
                .role(Role.RECRUIT)
                .manager(manager)
                .build();

        issue = Issue.builder()
                .id(UUID.randomUUID())
                .user(user)
                .date(LocalDate.now())
                .title("Test Issue")
                .description("Test description text here")
                .severity(IssueSeverity.MEDIUM)
                .status(IssueStatus.OPEN)
                .build();
    }

    @Test
    void create_validRequest_returnsIssueResponse() {
        IssueRequest request = new IssueRequest();
        request.setDate(LocalDate.now());
        request.setTitle("New Issue");
        request.setDescription("Issue description text");
        request.setSeverity(IssueSeverity.HIGH);
        request.setStatus(IssueStatus.OPEN);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(issueRepository.save(any(Issue.class))).thenReturn(issue);

        IssueResponse response = issueService.create(user.getId(), request);

        assertNotNull(response);
        verify(issueRepository).save(any(Issue.class));
    }

    @Test
    void create_resolvedWithoutNotes_throwsBadRequest() {
        IssueRequest request = new IssueRequest();
        request.setDate(LocalDate.now());
        request.setTitle("Resolved Issue");
        request.setDescription("Issue description text");
        request.setSeverity(IssueSeverity.LOW);
        request.setStatus(IssueStatus.RESOLVED);

        assertThrows(BadRequestException.class, () ->
                issueService.create(user.getId(), request));
    }

    @Test
    void create_resolvedWithNotes_succeeds() {
        IssueRequest request = new IssueRequest();
        request.setDate(LocalDate.now());
        request.setTitle("Resolved Issue");
        request.setDescription("Issue description text");
        request.setSeverity(IssueSeverity.LOW);
        request.setStatus(IssueStatus.RESOLVED);
        request.setResolutionNotes("Fixed it");

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(issueRepository.save(any(Issue.class))).thenReturn(issue);

        IssueResponse response = issueService.create(user.getId(), request);

        assertNotNull(response);
    }

    @Test
    void getById_managerOfAssignedRecruit_returnsIssue() {
        when(issueRepository.findById(issue.getId())).thenReturn(Optional.of(issue));

        IssueResponse response = issueService.getById(issue.getId(), manager.getId(), "MANAGER");

        assertNotNull(response);
    }

    @Test
    void getById_unrelatedManager_throwsUnauthorized() {
        when(issueRepository.findById(issue.getId())).thenReturn(Optional.of(issue));

        assertThrows(UnauthorizedException.class, () ->
                issueService.getById(issue.getId(), UUID.randomUUID(), "MANAGER"));
    }

    @Test
    void delete_ownerCanDelete() {
        when(issueRepository.findById(issue.getId())).thenReturn(Optional.of(issue));

        issueService.delete(issue.getId(), user.getId());

        verify(issueRepository).delete(issue);
    }

    @Test
    void delete_nonOwner_throwsUnauthorized() {
        when(issueRepository.findById(issue.getId())).thenReturn(Optional.of(issue));

        assertThrows(UnauthorizedException.class, () ->
                issueService.delete(issue.getId(), UUID.randomUUID()));
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        when(issueRepository.findById(any())).thenReturn(Optional.empty());

        IssueRequest request = new IssueRequest();
        request.setStatus(IssueStatus.OPEN);

        assertThrows(ResourceNotFoundException.class, () ->
                issueService.update(UUID.randomUUID(), user.getId(), request));
    }
}
