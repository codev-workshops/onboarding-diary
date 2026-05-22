package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.NoteRequest;
import com.onboardingdiary.dto.response.NoteResponse;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NoteService noteService;

    private User user;
    private Note note;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .email("recruit@test.com")
                .role(Role.RECRUIT)
                .build();

        note = Note.builder()
                .id(UUID.randomUUID())
                .user(user)
                .date(LocalDate.now())
                .title("Test Note")
                .content("Some content")
                .tags("tag1,tag2")
                .build();
    }

    @Test
    void create_validRequest_returnsNoteResponse() {
        NoteRequest request = new NoteRequest();
        request.setDate(LocalDate.now());
        request.setTitle("New Note");
        request.setContent("Content");
        request.setTags(List.of("java", "spring"));

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(noteRepository.save(any(Note.class))).thenReturn(note);

        NoteResponse response = noteService.create(user.getId(), request);

        assertNotNull(response);
        verify(noteRepository).save(any(Note.class));
    }

    @Test
    void create_withNullTags_handledGracefully() {
        NoteRequest request = new NoteRequest();
        request.setDate(LocalDate.now());
        request.setTitle("No Tags");
        request.setContent("Content");
        request.setTags(null);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(noteRepository.save(any(Note.class))).thenReturn(note);

        NoteResponse response = noteService.create(user.getId(), request);

        assertNotNull(response);
    }

    @Test
    void getById_ownerAccess_returnsNote() {
        when(noteRepository.findById(note.getId())).thenReturn(Optional.of(note));

        NoteResponse response = noteService.getById(note.getId(), user.getId(), "RECRUIT");

        assertEquals(note.getId(), response.getId());
    }

    @Test
    void getById_adminAccess_returnsNote() {
        when(noteRepository.findById(note.getId())).thenReturn(Optional.of(note));

        NoteResponse response = noteService.getById(note.getId(), UUID.randomUUID(), "ADMIN");

        assertNotNull(response);
    }

    @Test
    void getById_otherRecruit_throwsUnauthorized() {
        when(noteRepository.findById(note.getId())).thenReturn(Optional.of(note));

        assertThrows(UnauthorizedException.class, () ->
                noteService.getById(note.getId(), UUID.randomUUID(), "RECRUIT"));
    }

    @Test
    void update_ownerCanUpdate() {
        NoteRequest request = new NoteRequest();
        request.setDate(LocalDate.now());
        request.setTitle("Updated");
        request.setContent("Updated content");
        request.setTags(List.of("updated"));

        when(noteRepository.findById(note.getId())).thenReturn(Optional.of(note));
        when(noteRepository.save(any(Note.class))).thenReturn(note);

        NoteResponse response = noteService.update(note.getId(), user.getId(), request);

        assertNotNull(response);
    }

    @Test
    void delete_ownerCanDelete() {
        when(noteRepository.findById(note.getId())).thenReturn(Optional.of(note));

        noteService.delete(note.getId(), user.getId());

        verify(noteRepository).delete(note);
    }

    @Test
    void delete_nonOwner_throwsUnauthorized() {
        when(noteRepository.findById(note.getId())).thenReturn(Optional.of(note));

        assertThrows(UnauthorizedException.class, () ->
                noteService.delete(note.getId(), UUID.randomUUID()));
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        when(noteRepository.findById(any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                noteService.getById(UUID.randomUUID(), user.getId(), "RECRUIT"));
    }
}
