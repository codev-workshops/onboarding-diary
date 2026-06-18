package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateIssueRequest;
import com.onboardingdiary.dto.IssueFilter;
import com.onboardingdiary.dto.IssueResponse;
import com.onboardingdiary.dto.UpdateIssueRequest;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IssueServiceTest {

    @Mock
    private IssueRepository issueRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private IssueService issueService;

    private AuthenticatedUser admin() {
        return new AuthenticatedUser(1L, "admin@acme.com", "ADMIN");
    }

    private AuthenticatedUser manager(long id) {
        return new AuthenticatedUser(id, "mgr@acme.com", "MANAGER");
    }

    private AuthenticatedUser recruit(long id) {
        return new AuthenticatedUser(id, "rec@acme.com", "RECRUIT");
    }

    private Issue issue(Long id, Long ownerId) {
        Issue issue = new Issue();
        issue.setOwnerId(ownerId);
        issue.setDate(LocalDate.of(2026, 1, 5));
        issue.setTitle("VPN keeps dropping");
        issue.setSeverity(IssueSeverity.HIGH);
        issue.setStatus(IssueStatus.OPEN);
        try {
            Field field = Issue.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(issue, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return issue;
    }

    @Test
    void createAssignsOwnerToCallerAndDefaults() {
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> inv.getArgument(0));
        CreateIssueRequest request = new CreateIssueRequest(
                LocalDate.of(2026, 2, 1), "  Laptop won't boot  ", "  black screen  ",
                IssueSeverity.CRITICAL, null, "  ");

        IssueResponse response = issueService.create(recruit(5L), request);

        assertThat(response.ownerId()).isEqualTo(5L);
        assertThat(response.title()).isEqualTo("Laptop won't boot");
        assertThat(response.description()).isEqualTo("black screen");
        assertThat(response.severity()).isEqualTo(IssueSeverity.CRITICAL);
        assertThat(response.status()).isEqualTo(IssueStatus.OPEN);
        assertThat(response.resolutionNotes()).isNull();
    }

    @Test
    void ownerCanReadOwnIssue() {
        when(issueRepository.findById(10L)).thenReturn(Optional.of(issue(10L, 5L)));
        assertThat(issueService.get(recruit(5L), 10L).id()).isEqualTo(10L);
    }

    @Test
    void recruitCannotReadOthersIssue() {
        when(issueRepository.findById(10L)).thenReturn(Optional.of(issue(10L, 6L)));
        assertThatThrownBy(() -> issueService.get(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void adminCanReadAnyIssue() {
        when(issueRepository.findById(10L)).thenReturn(Optional.of(issue(10L, 6L)));
        assertThat(issueService.get(admin(), 10L).id()).isEqualTo(10L);
    }

    @Test
    void managerCanReadAssignedRecruitIssueOnly() {
        Issue assigned = issue(10L, 6L);
        User owner = TestUsers.recruit(6L, "owned@acme.com");
        owner.setManagerId(2L);
        when(issueRepository.findById(10L)).thenReturn(Optional.of(assigned));
        when(userRepository.findById(6L)).thenReturn(Optional.of(owner));

        assertThat(issueService.get(manager(2L), 10L).id()).isEqualTo(10L);

        User unmanaged = TestUsers.recruit(7L, "other@acme.com");
        unmanaged.setManagerId(99L);
        Issue otherIssue = issue(11L, 7L);
        when(issueRepository.findById(11L)).thenReturn(Optional.of(otherIssue));
        when(userRepository.findById(7L)).thenReturn(Optional.of(unmanaged));

        assertThatThrownBy(() -> issueService.get(manager(2L), 11L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateAllowedOnlyForOwner() {
        when(issueRepository.findById(10L)).thenReturn(Optional.of(issue(10L, 6L)));
        UpdateIssueRequest request = new UpdateIssueRequest(
                LocalDate.of(2026, 2, 2), "x", null,
                IssueSeverity.LOW, IssueStatus.RESOLVED, "fixed");

        assertThatThrownBy(() -> issueService.update(admin(), 10L, request))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(issueRepository, never()).save(any());
    }

    @Test
    void updateMutatesOwnedIssue() {
        when(issueRepository.findById(10L)).thenReturn(Optional.of(issue(10L, 5L)));
        when(issueRepository.save(any(Issue.class))).thenAnswer(inv -> inv.getArgument(0));
        UpdateIssueRequest request = new UpdateIssueRequest(
                LocalDate.of(2026, 3, 3), "Updated title", "desc",
                IssueSeverity.MEDIUM, IssueStatus.RESOLVED, "Reimaged the laptop");

        IssueResponse response = issueService.update(recruit(5L), 10L, request);

        assertThat(response.title()).isEqualTo("Updated title");
        assertThat(response.status()).isEqualTo(IssueStatus.RESOLVED);
        assertThat(response.severity()).isEqualTo(IssueSeverity.MEDIUM);
        assertThat(response.resolutionNotes()).isEqualTo("Reimaged the laptop");
    }

    @Test
    void deleteAllowedOnlyForOwner() {
        when(issueRepository.findById(10L)).thenReturn(Optional.of(issue(10L, 6L)));
        assertThatThrownBy(() -> issueService.delete(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(issueRepository, never()).delete(any(Issue.class));
    }

    @Test
    void deleteRemovesOwnedIssue() {
        Issue owned = issue(10L, 5L);
        when(issueRepository.findById(10L)).thenReturn(Optional.of(owned));
        issueService.delete(recruit(5L), 10L);
        verify(issueRepository).delete(owned);
    }

    @Test
    void listRejectsManagerFilteringUnmanagedOwner() {
        when(userRepository.findIdsByManagerId(2L)).thenReturn(List.of(6L));
        IssueFilter filter = new IssueFilter(99L, null, null, null, null, null);

        assertThatThrownBy(() -> issueService.list(manager(2L), filter, Pageable.unpaged()))
                .isInstanceOf(AccessDeniedException.class);
        verify(issueRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listAllowsRecruitOwnIssues() {
        Page<Issue> page = new PageImpl<>(List.of(issue(10L, 5L)));
        when(issueRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        IssueFilter filter = new IssueFilter(null, IssueStatus.OPEN, null, null, null, null);

        Page<IssueResponse> result = issueService.list(recruit(5L), filter, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        verify(issueRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
