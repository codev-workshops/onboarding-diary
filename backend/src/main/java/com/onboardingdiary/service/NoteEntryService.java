package com.onboardingdiary.service;

import com.onboardingdiary.dto.NoteEntryRequest;
import com.onboardingdiary.entity.NoteEntry;
import com.onboardingdiary.entity.Tag;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.NoteEntryRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class NoteEntryService {

    private final NoteEntryRepository noteEntryRepository;
    private final UserRepository userRepository;
    private final TagService tagService;

    public NoteEntryService(NoteEntryRepository noteEntryRepository, UserRepository userRepository, TagService tagService) {
        this.noteEntryRepository = noteEntryRepository;
        this.userRepository = userRepository;
        this.tagService = tagService;
    }

    public NoteEntry create(Long userId, NoteEntryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        NoteEntry entry = new NoteEntry();
        entry.setDate(request.getDate());
        entry.setTitle(request.getTitle());
        entry.setContent(request.getContent());
        entry.setUser(user);

        if (request.getTagNames() != null) {
            Set<Tag> tags = new HashSet<>();
            for (String tagName : request.getTagNames()) {
                tags.add(tagService.findOrCreateTag(tagName.trim().toLowerCase()));
            }
            entry.setTags(tags);
        }

        return noteEntryRepository.save(entry);
    }

    public List<NoteEntry> getByUser(Long userId, LocalDate dateFrom, LocalDate dateTo, String tag) {
        List<NoteEntry> entries;
        if (dateFrom != null && dateTo != null) {
            entries = noteEntryRepository.findByUserIdAndDateBetween(userId, dateFrom, dateTo);
        } else {
            entries = noteEntryRepository.findByUserIdOrderByDateDesc(userId);
        }

        if (tag != null && !tag.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> e.getTags().stream().anyMatch(t -> t.getName().equalsIgnoreCase(tag)))
                    .toList();
        }

        return entries;
    }

    public List<NoteEntry> getAll(LocalDate dateFrom, LocalDate dateTo, String tag) {
        List<NoteEntry> entries;
        if (dateFrom != null && dateTo != null) {
            entries = noteEntryRepository.findAllByDateBetween(dateFrom, dateTo);
        } else {
            entries = noteEntryRepository.findAllByOrderByDateDesc();
        }

        if (tag != null && !tag.isEmpty()) {
            entries = entries.stream()
                    .filter(e -> e.getTags().stream().anyMatch(t -> t.getName().equalsIgnoreCase(tag)))
                    .toList();
        }

        return entries;
    }

    public NoteEntry getById(Long id) {
        return noteEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note entry not found"));
    }

    public NoteEntry update(Long id, Long userId, NoteEntryRequest request) {
        NoteEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only update your own entries");
        }

        entry.setDate(request.getDate());
        entry.setTitle(request.getTitle());
        entry.setContent(request.getContent());

        if (request.getTagNames() != null) {
            Set<Tag> tags = new HashSet<>();
            for (String tagName : request.getTagNames()) {
                tags.add(tagService.findOrCreateTag(tagName.trim().toLowerCase()));
            }
            entry.setTags(tags);
        }

        return noteEntryRepository.save(entry);
    }

    public void delete(Long id, Long userId) {
        NoteEntry entry = getById(id);
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own entries");
        }
        noteEntryRepository.delete(entry);
    }
}
