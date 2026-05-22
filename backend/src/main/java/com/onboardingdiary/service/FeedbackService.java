package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.FeedbackRequest;
import com.onboardingdiary.dto.response.FeedbackResponse;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.FeedbackType;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    @Transactional
    public FeedbackResponse create(UUID userId, FeedbackRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Feedback feedback = Feedback.builder()
                .user(user)
                .date(request.getDate())
                .subject(request.getSubject())
                .type(request.getType())
                .details(request.getDetails())
                .build();

        feedback = feedbackRepository.save(feedback);
        return FeedbackResponse.from(feedback);
    }

    public Page<FeedbackResponse> list(UUID userId, LocalDate dateFrom, LocalDate dateTo,
                                        FeedbackType type, Pageable pageable) {
        return feedbackRepository.findByUserWithFilters(userId, dateFrom, dateTo, type, pageable)
                .map(FeedbackResponse::from);
    }

    public FeedbackResponse getById(UUID feedbackId, UUID requestingUserId, String role) {
        Feedback feedback = findFeedbackOrThrow(feedbackId);
        checkAccess(feedback, requestingUserId, role);
        return FeedbackResponse.from(feedback);
    }

    @Transactional
    public FeedbackResponse update(UUID feedbackId, UUID userId, FeedbackRequest request) {
        Feedback feedback = findFeedbackOrThrow(feedbackId);
        checkOwnership(feedback, userId);

        feedback.setDate(request.getDate());
        feedback.setSubject(request.getSubject());
        feedback.setType(request.getType());
        feedback.setDetails(request.getDetails());

        feedback = feedbackRepository.save(feedback);
        return FeedbackResponse.from(feedback);
    }

    @Transactional
    public void delete(UUID feedbackId, UUID userId) {
        Feedback feedback = findFeedbackOrThrow(feedbackId);
        checkOwnership(feedback, userId);
        feedbackRepository.delete(feedback);
    }

    private Feedback findFeedbackOrThrow(UUID feedbackId) {
        return feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));
    }

    private void checkOwnership(Feedback feedback, UUID userId) {
        if (!feedback.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only modify your own feedback");
        }
    }

    private void checkAccess(Feedback feedback, UUID requestingUserId, String role) {
        if (role.equals("ADMIN")) return;
        if (feedback.getUser().getId().equals(requestingUserId)) return;
        if (role.equals("MANAGER")) {
            User feedbackOwner = feedback.getUser();
            if (feedbackOwner.getManager() != null && feedbackOwner.getManager().getId().equals(requestingUserId)) {
                return;
            }
        }
        throw new UnauthorizedException("Access denied");
    }
}
