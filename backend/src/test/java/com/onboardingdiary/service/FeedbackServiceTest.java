package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateFeedbackRequest;
import com.onboardingdiary.dto.FeedbackFilter;
import com.onboardingdiary.dto.FeedbackResponse;
import com.onboardingdiary.dto.UpdateFeedbackRequest;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.FeedbackType;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.FeedbackRepository;
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
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FeedbackService feedbackService;

    private AuthenticatedUser admin() {
        return new AuthenticatedUser(1L, "admin@acme.com", "ADMIN");
    }

    private AuthenticatedUser manager(long id) {
        return new AuthenticatedUser(id, "mgr@acme.com", "MANAGER");
    }

    private AuthenticatedUser recruit(long id) {
        return new AuthenticatedUser(id, "rec@acme.com", "RECRUIT");
    }

    private Feedback feedback(Long id, Long ownerId) {
        Feedback feedback = new Feedback();
        feedback.setOwnerId(ownerId);
        feedback.setDate(LocalDate.of(2026, 1, 5));
        feedback.setSubject("Great onboarding buddy");
        feedback.setType(FeedbackType.POSITIVE);
        try {
            Field field = Feedback.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(feedback, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return feedback;
    }

    @Test
    void createAssignsOwnerToCallerAndTrims() {
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));
        CreateFeedbackRequest request = new CreateFeedbackRequest(
                LocalDate.of(2026, 2, 1), "  More desk space please  ",
                FeedbackType.SUGGESTION, "  open plan is noisy  ");

        FeedbackResponse response = feedbackService.create(recruit(5L), request);

        assertThat(response.ownerId()).isEqualTo(5L);
        assertThat(response.subject()).isEqualTo("More desk space please");
        assertThat(response.type()).isEqualTo(FeedbackType.SUGGESTION);
        assertThat(response.details()).isEqualTo("open plan is noisy");
    }

    @Test
    void ownerCanReadOwnFeedback() {
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(feedback(10L, 5L)));
        assertThat(feedbackService.get(recruit(5L), 10L).id()).isEqualTo(10L);
    }

    @Test
    void recruitCannotReadOthersFeedback() {
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(feedback(10L, 6L)));
        assertThatThrownBy(() -> feedbackService.get(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void adminCanReadAnyFeedback() {
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(feedback(10L, 6L)));
        assertThat(feedbackService.get(admin(), 10L).id()).isEqualTo(10L);
    }

    @Test
    void managerCanReadAssignedRecruitFeedbackOnly() {
        Feedback assigned = feedback(10L, 6L);
        User owner = TestUsers.recruit(6L, "owned@acme.com");
        owner.setManagerId(2L);
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(assigned));
        when(userRepository.findById(6L)).thenReturn(Optional.of(owner));

        assertThat(feedbackService.get(manager(2L), 10L).id()).isEqualTo(10L);

        User unmanaged = TestUsers.recruit(7L, "other@acme.com");
        unmanaged.setManagerId(99L);
        Feedback other = feedback(11L, 7L);
        when(feedbackRepository.findById(11L)).thenReturn(Optional.of(other));
        when(userRepository.findById(7L)).thenReturn(Optional.of(unmanaged));

        assertThatThrownBy(() -> feedbackService.get(manager(2L), 11L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateAllowedOnlyForOwner() {
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(feedback(10L, 6L)));
        UpdateFeedbackRequest request = new UpdateFeedbackRequest(
                LocalDate.of(2026, 2, 2), "x", FeedbackType.CONCERN, null);

        assertThatThrownBy(() -> feedbackService.update(admin(), 10L, request))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(feedbackRepository, never()).save(any());
    }

    @Test
    void updateMutatesOwnedFeedback() {
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(feedback(10L, 5L)));
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));
        UpdateFeedbackRequest request = new UpdateFeedbackRequest(
                LocalDate.of(2026, 3, 3), "Updated subject", FeedbackType.CONCERN, "needs attention");

        FeedbackResponse response = feedbackService.update(recruit(5L), 10L, request);

        assertThat(response.subject()).isEqualTo("Updated subject");
        assertThat(response.type()).isEqualTo(FeedbackType.CONCERN);
        assertThat(response.details()).isEqualTo("needs attention");
    }

    @Test
    void deleteAllowedOnlyForOwner() {
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(feedback(10L, 6L)));
        assertThatThrownBy(() -> feedbackService.delete(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(feedbackRepository, never()).delete(any(Feedback.class));
    }

    @Test
    void deleteRemovesOwnedFeedback() {
        Feedback owned = feedback(10L, 5L);
        when(feedbackRepository.findById(10L)).thenReturn(Optional.of(owned));
        feedbackService.delete(recruit(5L), 10L);
        verify(feedbackRepository).delete(owned);
    }

    @Test
    void listRejectsManagerFilteringUnmanagedOwner() {
        when(userRepository.findIdsByManagerId(2L)).thenReturn(List.of(6L));
        FeedbackFilter filter = new FeedbackFilter(99L, null, null, null, null);

        assertThatThrownBy(() -> feedbackService.list(manager(2L), filter, Pageable.unpaged()))
                .isInstanceOf(AccessDeniedException.class);
        verify(feedbackRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listAllowsRecruitOwnFeedback() {
        Page<Feedback> page = new PageImpl<>(List.of(feedback(10L, 5L)));
        when(feedbackRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        FeedbackFilter filter = new FeedbackFilter(null, FeedbackType.POSITIVE, null, null, null);

        Page<FeedbackResponse> result = feedbackService.list(recruit(5L), filter, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        verify(feedbackRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
