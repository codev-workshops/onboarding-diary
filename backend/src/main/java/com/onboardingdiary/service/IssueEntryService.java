package com.onboardingdiary.service;

import com.onboardingdiary.dto.IssueEntryRequest;
import com.onboardingdiary.entity.IssueEntry;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.IssueSeverity;
import com.onboardingdiary.entity.enums.IssueStatus;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.IssueEntryRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class IssueEntryService {

    private final IssueEntryRepository issueEntryRepository;
    private final UserRepository userRepository;

    public IssueEntryService(IssueEntryRepository issueEntryRepository, UserRepository userRepository) {
        this.issueEntryRepository = issueEntryRepository;
        this.userRepository = userRepository;
    }

    public IssueEntry create(Long userId, IssueEntryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        IssueEntry entry = new IssueEntry();
        entry.setDate(request.getDate());
        entry.setTitle(request.getTitle());
        entry.setDescription(request.getDescription());
        entry.setSeverity(request.getSeverity() != null ? IssueSeverity.valueOf(request.getSeverity()) : IssueSeverity.MEDIUM);
        entry.setStatus(request.getStatus() != null ? IssueStatus.valueOf(request.getStatus()) : IssueStatus.OPEN);
        entry.setResolutionNotes(request.getResolutionNotes());
        entry.setUser(user);

        return issueEntryRepository.save(entry);
    }

    public List<IssueEntry> getByUser(Long userId, LocalDate dateFrom, LocalDate dateTo,
                                       String status, String severity) {
        List<IssueEntry> entries;
        if (dateFrom != null && dateTo != null) {
            entries = issueEntryRepository.findByUserIdAndDateBetween(userId, dateFrom, dateTo);
        } else {
            entries = issueEntryRepository.findByUserIdOrderByDateDesc(userId);
        }

        if (status != null && !status.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> e.getStatus() != null && status.equals(e.getStatus().name()))
                    .toList();
        }
        if (severity != null && !severity.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> e.getSeverity() != null && severity.equals(e.getSeverity().name()))
                    .toList();
        }

        return entries;
    }

    public IssueEntry getById(Long id) {
        return issueEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Issue entry not found"));
    }

    public IssueEntry update(Long id, Long userId, IssueEntryRequest request) {
        IssueEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only update your own entries");
        }

        entry.setDate(request.getDate());
        entry.setTitle(request.getTitle());
        entry.setDescription(request.getDescription());
        if (request.getSeverity() != null) entry.setSeverity(IssueSeverity.valueOf(request.getSeverity()));
        if (request.getStatus() != null) entry.setStatus(IssueStatus.valueOf(request.getStatus()));
        entry.setResolutionNotes(request.getResolutionNotes());

        return issueEntryRepository.save(entry);
    }

    public void delete(Long id, Long userId) {
        IssueEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own entries");
        }
        issueEntryRepository.delete(entry);
    }
}
