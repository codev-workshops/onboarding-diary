package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.FeedbackRequest;
import com.onboardingdiary.dto.response.FeedbackResponse;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.FeedbackType;
import com.onboardingdiary.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.FeedbackRepository;
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
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FeedbackService feedbackService;

    private User user;
    private User manager;
    private Feedback feedback;

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

        feedback = Feedback.builder()
                .id(UUID.randomUUID())
                .user(user)
                .date(LocalDate.now())
                .subject("Great onboarding")
                .type(FeedbackType.POSITIVE)
                .details("Very helpful session")
                .build();
    }

    @Test
    void create_validRequest_returnsFeedbackResponse() {
        FeedbackRequest request = new FeedbackRequest();
        request.setDate(LocalDate.now());
        request.setSubject("Feedback");
        request.setType(FeedbackType.SUGGESTION);
        request.setDetails("Some suggestion details");

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(feedbackRepository.save(any(Feedback.class))).thenReturn(feedback);

        FeedbackResponse response = feedbackService.create(user.getId(), request);

        assertNotNull(response);
        verify(feedbackRepository).save(any(Feedback.class));
    }

    @Test
    void create_userNotFound_throwsResourceNotFoundException() {
        FeedbackRequest request = new FeedbackRequest();
        request.setDate(LocalDate.now());
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                feedbackService.create(UUID.randomUUID(), request));
    }

    @Test
    void getById_ownerAccess_returnsFeedback() {
        when(feedbackRepository.findById(feedback.getId())).thenReturn(Optional.of(feedback));

        FeedbackResponse response = feedbackService.getById(feedback.getId(), user.getId(), "RECRUIT");

        assertEquals(feedback.getId(), response.getId());
    }

    @Test
    void getById_managerOfAssignedRecruit_returnsFeedback() {
        when(feedbackRepository.findById(feedback.getId())).thenReturn(Optional.of(feedback));

        FeedbackResponse response = feedbackService.getById(feedback.getId(), manager.getId(), "MANAGER");

        assertNotNull(response);
    }

    @Test
    void getById_unrelatedUser_throwsUnauthorized() {
        when(feedbackRepository.findById(feedback.getId())).thenReturn(Optional.of(feedback));

        assertThrows(UnauthorizedException.class, () ->
                feedbackService.getById(feedback.getId(), UUID.randomUUID(), "RECRUIT"));
    }

    @Test
    void update_ownerCanUpdate() {
        FeedbackRequest request = new FeedbackRequest();
        request.setDate(LocalDate.now());
        request.setSubject("Updated");
        request.setType(FeedbackType.CONCERN);
        request.setDetails("Updated details");

        when(feedbackRepository.findById(feedback.getId())).thenReturn(Optional.of(feedback));
        when(feedbackRepository.save(any(Feedback.class))).thenReturn(feedback);

        FeedbackResponse response = feedbackService.update(feedback.getId(), user.getId(), request);

        assertNotNull(response);
    }

    @Test
    void update_nonOwner_throwsUnauthorized() {
        FeedbackRequest request = new FeedbackRequest();
        when(feedbackRepository.findById(feedback.getId())).thenReturn(Optional.of(feedback));

        assertThrows(UnauthorizedException.class, () ->
                feedbackService.update(feedback.getId(), UUID.randomUUID(), request));
    }

    @Test
    void delete_ownerCanDelete() {
        when(feedbackRepository.findById(feedback.getId())).thenReturn(Optional.of(feedback));

        feedbackService.delete(feedback.getId(), user.getId());

        verify(feedbackRepository).delete(feedback);
    }

    @Test
    void delete_nonOwner_throwsUnauthorized() {
        when(feedbackRepository.findById(feedback.getId())).thenReturn(Optional.of(feedback));

        assertThrows(UnauthorizedException.class, () ->
                feedbackService.delete(feedback.getId(), UUID.randomUUID()));
    }
}
