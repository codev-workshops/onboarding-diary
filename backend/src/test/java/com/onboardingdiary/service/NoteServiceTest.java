package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateNoteRequest;
import com.onboardingdiary.dto.NoteFilter;
import com.onboardingdiary.dto.NoteResponse;
import com.onboardingdiary.dto.UpdateNoteRequest;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.NoteRepository;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    private NoteRepository noteRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NoteService noteService;

    private AuthenticatedUser admin() {
        return new AuthenticatedUser(1L, "admin@acme.com", "ADMIN");
    }

    private AuthenticatedUser manager(long id) {
        return new AuthenticatedUser(id, "mgr@acme.com", "MANAGER");
    }

    private AuthenticatedUser recruit(long id) {
        return new AuthenticatedUser(id, "rec@acme.com", "RECRUIT");
    }

    private Note note(Long id, Long ownerId, String... tags) {
        Note note = new Note();
        note.setOwnerId(ownerId);
        note.setDate(LocalDate.of(2026, 1, 5));
        note.setTitle("Standup notes");
        note.setTags(new LinkedHashSet<>(List.of(tags)));
        try {
            Field field = Note.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(note, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return note;
    }

    @Test
    void createAssignsOwnerNormalizesTagsAndTrims() {
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));
        CreateNoteRequest request = new CreateNoteRequest(
                LocalDate.of(2026, 2, 1), "  Onboarding checklist  ", "  do the setup  ",
                List.of(" Setup ", "setup", "DOCS", ""));

        NoteResponse response = noteService.create(recruit(5L), request);

        assertThat(response.ownerId()).isEqualTo(5L);
        assertThat(response.title()).isEqualTo("Onboarding checklist");
        assertThat(response.content()).isEqualTo("do the setup");
        assertThat(response.tags()).containsExactly("docs", "setup");
    }

    @Test
    void ownerCanReadOwnNote() {
        when(noteRepository.findById(10L)).thenReturn(Optional.of(note(10L, 5L)));
        assertThat(noteService.get(recruit(5L), 10L).id()).isEqualTo(10L);
    }

    @Test
    void recruitCannotReadOthersNote() {
        when(noteRepository.findById(10L)).thenReturn(Optional.of(note(10L, 6L)));
        assertThatThrownBy(() -> noteService.get(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void adminCanReadAnyNote() {
        when(noteRepository.findById(10L)).thenReturn(Optional.of(note(10L, 6L)));
        assertThat(noteService.get(admin(), 10L).id()).isEqualTo(10L);
    }

    @Test
    void managerCanReadAssignedRecruitNoteOnly() {
        User owner = TestUsers.recruit(6L, "owned@acme.com");
        owner.setManagerId(2L);
        when(noteRepository.findById(10L)).thenReturn(Optional.of(note(10L, 6L)));
        when(userRepository.findById(6L)).thenReturn(Optional.of(owner));

        assertThat(noteService.get(manager(2L), 10L).id()).isEqualTo(10L);

        User unmanaged = TestUsers.recruit(7L, "other@acme.com");
        unmanaged.setManagerId(99L);
        when(noteRepository.findById(11L)).thenReturn(Optional.of(note(11L, 7L)));
        when(userRepository.findById(7L)).thenReturn(Optional.of(unmanaged));

        assertThatThrownBy(() -> noteService.get(manager(2L), 11L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateAllowedOnlyForOwner() {
        when(noteRepository.findById(10L)).thenReturn(Optional.of(note(10L, 6L)));
        UpdateNoteRequest request = new UpdateNoteRequest(
                LocalDate.of(2026, 2, 2), "x", null, List.of());

        assertThatThrownBy(() -> noteService.update(admin(), 10L, request))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(noteRepository, never()).save(any());
    }

    @Test
    void updateMutatesOwnedNote() {
        when(noteRepository.findById(10L)).thenReturn(Optional.of(note(10L, 5L, "old")));
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));
        UpdateNoteRequest request = new UpdateNoteRequest(
                LocalDate.of(2026, 3, 3), "Updated title", "new content", List.of("New", "fresh"));

        NoteResponse response = noteService.update(recruit(5L), 10L, request);

        assertThat(response.title()).isEqualTo("Updated title");
        assertThat(response.content()).isEqualTo("new content");
        assertThat(response.tags()).containsExactly("fresh", "new");
    }

    @Test
    void deleteAllowedOnlyForOwner() {
        when(noteRepository.findById(10L)).thenReturn(Optional.of(note(10L, 6L)));
        assertThatThrownBy(() -> noteService.delete(recruit(5L), 10L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(noteRepository, never()).delete(any(Note.class));
    }

    @Test
    void deleteRemovesOwnedNote() {
        Note owned = note(10L, 5L);
        when(noteRepository.findById(10L)).thenReturn(Optional.of(owned));
        noteService.delete(recruit(5L), 10L);
        verify(noteRepository).delete(owned);
    }

    @Test
    void listRejectsManagerFilteringUnmanagedOwner() {
        when(userRepository.findIdsByManagerId(2L)).thenReturn(List.of(6L));
        NoteFilter filter = new NoteFilter(99L, null, null, null, null);

        assertThatThrownBy(() -> noteService.list(manager(2L), filter, Pageable.unpaged()))
                .isInstanceOf(AccessDeniedException.class);
        verify(noteRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void listAllowsRecruitOwnNotesWithTagFilter() {
        Page<Note> page = new PageImpl<>(List.of(note(10L, 5L, "setup")));
        when(noteRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        NoteFilter filter = new NoteFilter(null, List.of("setup"), null, null, null);

        Page<NoteResponse> result = noteService.list(recruit(5L), filter, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        verify(noteRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    void normalizesEmptyTagsToEmptySet() {
        when(noteRepository.save(any(Note.class))).thenAnswer(inv -> inv.getArgument(0));
        CreateNoteRequest request = new CreateNoteRequest(
                LocalDate.of(2026, 2, 1), "No tags", null, null);

        NoteResponse response = noteService.create(recruit(5L), request);

        Set<String> empty = new LinkedHashSet<>();
        assertThat(response.tags()).isEqualTo(List.copyOf(empty));
    }
}
