package com.onboardingdiary.service;

import com.onboardingdiary.dto.FeedbackEntryRequest;
import com.onboardingdiary.entity.FeedbackEntry;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.FeedbackType;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.FeedbackEntryRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class FeedbackEntryService {

    private final FeedbackEntryRepository feedbackEntryRepository;
    private final UserRepository userRepository;

    public FeedbackEntryService(FeedbackEntryRepository feedbackEntryRepository, UserRepository userRepository) {
        this.feedbackEntryRepository = feedbackEntryRepository;
        this.userRepository = userRepository;
    }

    public FeedbackEntry create(Long userId, FeedbackEntryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        FeedbackEntry entry = new FeedbackEntry();
        entry.setDate(request.getDate());
        entry.setSubject(request.getSubject());
        entry.setType(FeedbackType.valueOf(request.getType()));
        entry.setDetails(request.getDetails());
        entry.setUser(user);

        return feedbackEntryRepository.save(entry);
    }

    public List<FeedbackEntry> getByUser(Long userId, LocalDate dateFrom, LocalDate dateTo, String type) {
        List<FeedbackEntry> entries;
        if (dateFrom != null && dateTo != null) {
            entries = feedbackEntryRepository.findByUserIdAndDateBetween(userId, dateFrom, dateTo);
        } else {
            entries = feedbackEntryRepository.findByUserIdOrderByDateDesc(userId);
        }

        if (type != null && !type.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> e.getType() != null && type.equals(e.getType().name()))
                    .toList();
        }

        return entries;
    }

    public List<FeedbackEntry> getAll(LocalDate dateFrom, LocalDate dateTo, String type) {
        List<FeedbackEntry> entries;
        if (dateFrom != null && dateTo != null) {
            entries = feedbackEntryRepository.findAllByDateBetween(dateFrom, dateTo);
        } else {
            entries = feedbackEntryRepository.findAllByOrderByDateDesc();
        }

        if (type != null && !type.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> e.getType() != null && type.equals(e.getType().name()))
                    .toList();
        }

        return entries;
    }

    public FeedbackEntry getById(Long id) {
        return feedbackEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback entry not found"));
    }

    public FeedbackEntry update(Long id, Long userId, FeedbackEntryRequest request) {
        FeedbackEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only update your own entries");
        }

        entry.setDate(request.getDate());
        entry.setSubject(request.getSubject());
        entry.setType(FeedbackType.valueOf(request.getType()));
        entry.setDetails(request.getDetails());

        return feedbackEntryRepository.save(entry);
    }

    public void delete(Long id, Long userId) {
        FeedbackEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own entries");
        }
        feedbackEntryRepository.delete(entry);
    }
}
