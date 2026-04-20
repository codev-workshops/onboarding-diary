package com.onboarding.diary.controller;

import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.security.SecurityUtils;
import com.onboarding.diary.dto.CreateNoteRequest;
import com.onboarding.diary.dto.NoteFilterParams;
import com.onboarding.diary.dto.NoteResponse;
import com.onboarding.diary.dto.UpdateNoteRequest;
import com.onboarding.diary.service.NoteService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    public ResponseEntity<NoteResponse> create(@Valid @RequestBody CreateNoteRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        NoteResponse response = noteService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<NoteResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String tag) {
        String userId = SecurityUtils.getCurrentUserId();
        NoteFilterParams filters = NoteFilterParams.builder()
                .tag(tag)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(noteService.list(userId, filters, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteResponse> getById(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        String role = SecurityUtils.getCurrentUserRole();
        return ResponseEntity.ok(noteService.getById(id, userId, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteResponse> update(@PathVariable String id,
            @Valid @RequestBody UpdateNoteRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(noteService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = SecurityUtils.getCurrentUserId();
        noteService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tags")
    public ResponseEntity<List<String>> getUserTags() {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(noteService.getUserTags(userId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<PageResponse<NoteResponse>> listForUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String tag) {
        String role = SecurityUtils.getCurrentUserRole();
        if (!"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Only managers and admins can view other users' notes");
        }
        NoteFilterParams filters = NoteFilterParams.builder()
                .tag(tag)
                .build();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(noteService.listForUser(userId, filters, pageable));
    }

    @GetMapping("/internal/user/{userId}")
    public ResponseEntity<List<NoteResponse>> getNotesInRange(
            @PathVariable String userId,
            @RequestParam String dateFrom,
            @RequestParam String dateTo) {
        return ResponseEntity.ok(noteService.getNotesInRange(userId, dateFrom, dateTo));
    }
}
