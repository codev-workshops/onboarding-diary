package com.onboarding.diary.service;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.exception.ResourceNotFoundException;
import com.onboarding.diary.dto.CreateNoteRequest;
import com.onboarding.diary.dto.NoteFilterParams;
import com.onboarding.diary.dto.NoteResponse;
import com.onboarding.diary.dto.UpdateNoteRequest;
import com.onboarding.diary.entity.NoteEntry;
import com.onboarding.diary.repository.NoteEntryRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteEntryRepository noteEntryRepository;

    @Transactional
    public NoteResponse create(String userId, CreateNoteRequest request) {
        String now = Instant.now().toString();
        NoteEntry entry = NoteEntry.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .date(request.getDate())
                .title(request.getTitle())
                .content(request.getContent())
                .tags(tagsToString(request.getTags()))
                .deleted(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        noteEntryRepository.save(entry);
        return toResponse(entry);
    }

    public NoteResponse getById(String id, String requestingUserId, String role) {
        NoteEntry entry = noteEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note", id));
        if (!entry.getUserId().equals(requestingUserId)
                && !"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("You do not have permission to view this note");
        }
        return toResponse(entry);
    }

    public PageResponse<NoteResponse> list(String userId, NoteFilterParams filters, Pageable pageable) {
        Page<NoteEntry> page;
        if (filters.getTag() != null && !filters.getTag().isEmpty()) {
            page = noteEntryRepository.findByUserIdAndTagContainingAndDeletedFalse(
                    userId, filters.getTag(), pageable);
        } else {
            page = noteEntryRepository.findByUserIdAndDeletedFalse(userId, pageable);
        }
        return toPageResponse(page);
    }

    public PageResponse<NoteResponse> listForUser(String targetUserId, NoteFilterParams filters, Pageable pageable) {
        return list(targetUserId, filters, pageable);
    }

    @Transactional
    public NoteResponse update(String id, String userId, UpdateNoteRequest request) {
        NoteEntry entry = noteEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to update this note");
        }
        if (request.getDate() != null) entry.setDate(request.getDate());
        if (request.getTitle() != null) entry.setTitle(request.getTitle());
        if (request.getContent() != null) entry.setContent(request.getContent());
        if (request.getTags() != null) entry.setTags(tagsToString(request.getTags()));
        entry.setUpdatedAt(Instant.now().toString());
        noteEntryRepository.save(entry);
        return toResponse(entry);
    }

    @Transactional
    public void delete(String id, String userId) {
        NoteEntry entry = noteEntryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note", id));
        if (!entry.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to delete this note");
        }
        entry.setDeleted(true);
        entry.setUpdatedAt(Instant.now().toString());
        noteEntryRepository.save(entry);
    }

    public List<NoteResponse> getNotesInRange(String userId, String dateFrom, String dateTo) {
        return noteEntryRepository.findByUserIdAndDateBetweenAndDeletedFalse(userId, dateFrom, dateTo)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public long countByUserId(String userId) {
        return noteEntryRepository.countByUserIdAndDeletedFalse(userId);
    }

    public List<String> getUserTags(String userId) {
        List<String> tagStrings = noteEntryRepository.findDistinctTagsByUserId(userId);
        Set<String> uniqueTags = new HashSet<>();
        for (String tagString : tagStrings) {
            if (tagString != null && !tagString.isEmpty()) {
                Arrays.stream(tagString.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .forEach(uniqueTags::add);
            }
        }
        return new ArrayList<>(uniqueTags);
    }

    private String tagsToString(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        return String.join(",", tags);
    }

    private List<String> stringToTags(String tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private NoteResponse toResponse(NoteEntry entry) {
        return NoteResponse.builder()
                .id(entry.getId())
                .userId(entry.getUserId())
                .date(entry.getDate())
                .title(entry.getTitle())
                .content(entry.getContent())
                .tags(stringToTags(entry.getTags()))
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }

    private PageResponse<NoteResponse> toPageResponse(Page<NoteEntry> page) {
        return PageResponse.<NoteResponse>builder()
                .content(page.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}
