package com.onboardingdiary.controller;

import com.onboardingdiary.dto.request.NoteRequest;
import com.onboardingdiary.dto.response.NoteResponse;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    public ResponseEntity<NoteResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody NoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.create(principal.getId(), request));
    }

    @GetMapping
    public ResponseEntity<Page<NoteResponse>> list(@AuthenticationPrincipal UserPrincipal principal,
                                                    @RequestParam(required = false) LocalDate dateFrom,
                                                    @RequestParam(required = false) LocalDate dateTo,
                                                    @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(noteService.list(principal.getId(), dateFrom, dateTo, pageable));
    }

    @GetMapping("/{noteId}")
    public ResponseEntity<NoteResponse> getById(@AuthenticationPrincipal UserPrincipal principal,
                                                 @PathVariable UUID noteId) {
        return ResponseEntity.ok(noteService.getById(noteId, principal.getId(), principal.getRole()));
    }

    @PutMapping("/{noteId}")
    public ResponseEntity<NoteResponse> update(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable UUID noteId,
                                                @Valid @RequestBody NoteRequest request) {
        return ResponseEntity.ok(noteService.update(noteId, principal.getId(), request));
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserPrincipal principal,
                                        @PathVariable UUID noteId) {
        noteService.delete(noteId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
