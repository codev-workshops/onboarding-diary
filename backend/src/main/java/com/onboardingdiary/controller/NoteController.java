package com.onboardingdiary.controller;

import com.onboardingdiary.dto.CreateNoteRequest;
import com.onboardingdiary.dto.NoteFilter;
import com.onboardingdiary.dto.NoteResponse;
import com.onboardingdiary.dto.PagedResponse;
import com.onboardingdiary.dto.UpdateNoteRequest;
import com.onboardingdiary.security.AuthenticatedUser;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.NoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notes")
@Tag(name = "Notes")
public class NoteController {

    private static final int MAX_PAGE_SIZE = 100;

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping
    @Operation(summary = "Create a note owned by the authenticated user")
    public ResponseEntity<NoteResponse> create(@Valid @RequestBody CreateNoteRequest request) {
        NoteResponse created = noteService.create(CurrentUser.require(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List notes (recruit: own; manager: own + assigned recruits; admin: all)")
    public PagedResponse<NoteResponse> list(
            @RequestParam(required = false) Long ownerId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        AuthenticatedUser caller = CurrentUser.require();
        NoteFilter filter = new NoteFilter(ownerId, tags, dateFrom, dateTo, search);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size),
                Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id")));
        return PagedResponse.from(noteService.list(caller, filter, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a note by id (owner, assigned manager, or admin)")
    public NoteResponse get(@PathVariable Long id) {
        return noteService.get(CurrentUser.require(), id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a note (owner only)")
    public NoteResponse update(@PathVariable Long id, @Valid @RequestBody UpdateNoteRequest request) {
        return noteService.update(CurrentUser.require(), id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a note (owner only)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        noteService.delete(CurrentUser.require(), id);
        return ResponseEntity.noContent().build();
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 1;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
