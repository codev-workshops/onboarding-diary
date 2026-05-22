package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.NoteRequest;
import com.onboardingdiary.dto.response.NoteResponse;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    @Transactional
    public NoteResponse create(UUID userId, NoteRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Note note = Note.builder()
                .user(user)
                .date(request.getDate())
                .title(request.getTitle())
                .content(request.getContent())
                .tags(tagsToString(request.getTags()))
                .build();

        note = noteRepository.save(note);
        return NoteResponse.from(note);
    }

    public Page<NoteResponse> list(UUID userId, LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {
        return noteRepository.findByUserWithFilters(userId, dateFrom, dateTo, pageable)
                .map(NoteResponse::from);
    }

    public NoteResponse getById(UUID noteId, UUID requestingUserId, String role) {
        Note note = findNoteOrThrow(noteId);
        checkAccess(note, requestingUserId, role);
        return NoteResponse.from(note);
    }

    @Transactional
    public NoteResponse update(UUID noteId, UUID userId, NoteRequest request) {
        Note note = findNoteOrThrow(noteId);
        checkOwnership(note, userId);

        note.setDate(request.getDate());
        note.setTitle(request.getTitle());
        note.setContent(request.getContent());
        note.setTags(tagsToString(request.getTags()));

        note = noteRepository.save(note);
        return NoteResponse.from(note);
    }

    @Transactional
    public void delete(UUID noteId, UUID userId) {
        Note note = findNoteOrThrow(noteId);
        checkOwnership(note, userId);
        noteRepository.delete(note);
    }

    private String tagsToString(List<String> tags) {
        if (tags == null || tags.isEmpty()) return "";
        return String.join(",", tags);
    }

    private Note findNoteOrThrow(UUID noteId) {
        return noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
    }

    private void checkOwnership(Note note, UUID userId) {
        if (!note.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only modify your own notes");
        }
    }

    private void checkAccess(Note note, UUID requestingUserId, String role) {
        if (role.equals("ADMIN")) return;
        if (note.getUser().getId().equals(requestingUserId)) return;
        throw new UnauthorizedException("Access denied");
    }
}
