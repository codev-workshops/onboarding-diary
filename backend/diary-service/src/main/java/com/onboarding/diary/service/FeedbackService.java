package com.onboarding.diary.service;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.exception.ResourceNotFoundException;
import com.onboarding.diary.dto.CreateFeedbackRequest;
import com.onboarding.diary.dto.FeedbackFilterParams;
import com.onboarding.diary.dto.FeedbackResponse;
import com.onboarding.diary.dto.UpdateFeedbackRequest;
import com.onboarding.diary.entity.FeedbackEntry;
import com.onboarding.diary.entity.FeedbackType;
import com.onboarding.diary.repository.FeedbackEntryRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackEntryRepository feedbackEntryRepository;

    @Transactional
    public FeedbackResponse create(String userId, CreateFeedbackRequest request) {
        String now = Instant.now().toString();
        FeedbackEntry entry = FeedbackEntry.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .date(request.getDate())
                .subject(request.getSubject())
                .type(request.getType())
                .details(request.getDetails())
                .deleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        feedbackEntryRepository.save(entry);
        return toResponse(entry);
    }

    public FeedbackResponse getById(String id, String requestingUserId, String role) {
        FeedbackEntry entry = feedbackEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback", id));
        if (!entry.getUserId().equals(requestingUserId)
                && !"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("You do not have permission to view this feedback");
        }
        return toResponse(entry);
    }

    public PageResponse<FeedbackResponse> list(String userId, FeedbackFilterParams filters, Pageable pageable) {
        Page<FeedbackEntry> page;
        if (filters.getType() != null) {
            page = feedbackEntryRepository.findByUserIdAndTypeAndDeletedFalse(
                    userId, filters.getType(), pageable);
        } else {
            page = feedbackEntryRepository.findByUserIdAndDeletedFalse(userId, pageable);
        }
        return toPageResponse(page);
    }

    public PageResponse<FeedbackResponse> listForUser(String targetUserId, FeedbackFilterParams filters, Pageable pageable) {
        return list(targetUserId, filters, pageable);
    }

    @Transactional
    public FeedbackResponse update(String id, String userId, UpdateFeedbackRequest request) {
        FeedbackEntry entry = feedbackEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to update this feedback");
        }
        if (request.getDate() != null) entry.setDate(request.getDate());
        if (request.getSubject() != null) entry.setSubject(request.getSubject());
        if (request.getType() != null) entry.setType(request.getType());
        if (request.getDetails() != null) entry.setDetails(request.getDetails());
        entry.setUpdatedAt(Instant.now().toString());
        feedbackEntryRepository.save(entry);
        return toResponse(entry);
    }

    @Transactional
    public void delete(String id, String userId) {
        FeedbackEntry entry = feedbackEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to delete this feedback");
        }
        entry.setDeleted(true);
        entry.setUpdatedAt(Instant.now().toString());
        feedbackEntryRepository.save(entry);
    }

    public List<FeedbackResponse> getFeedbackInRange(String userId, String dateFrom, String dateTo) {
        return feedbackEntryRepository.findByUserIdAndDateBetweenAndDeletedFalse(userId, dateFrom, dateTo)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public long countByUserId(String userId) {
        return feedbackEntryRepository.countByUserIdAndDeletedFalse(userId);
    }

    private FeedbackResponse toResponse(FeedbackEntry entry) {
        return FeedbackResponse.builder()
                .id(entry.getId())
                .userId(entry.getUserId())
                .date(entry.getDate())
                .subject(entry.getSubject())
                .type(entry.getType())
                .details(entry.getDetails())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }

    private PageResponse<FeedbackResponse> toPageResponse(Page<FeedbackEntry> page) {
        return PageResponse.<FeedbackResponse>builder()
                .content(page.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}
