package com.codev.onboardingdiary.web.api;

import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.NoteService;
import com.codev.onboardingdiary.web.dto.DtoMapper;
import com.codev.onboardingdiary.web.dto.NoteDto;
import com.codev.onboardingdiary.web.dto.NoteFilter;
import com.codev.onboardingdiary.web.dto.NoteForm;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
public class NoteApiController {

    private final NoteService noteService;

    public NoteApiController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<NoteDto> list(@AuthenticationPrincipal AppUserDetails principal,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                              @RequestParam(required = false) String q) {
        return noteService.list(principal, principal.getId(), new NoteFilter(from, to, q))
                .stream().map(DtoMapper::toDto).toList();
    }

    @PostMapping
    public ResponseEntity<NoteDto> create(@AuthenticationPrincipal AppUserDetails principal,
                                          @Valid @RequestBody NoteForm form) {
        return ResponseEntity.status(HttpStatus.CREATED).body(DtoMapper.toDto(noteService.create(principal, form)));
    }

    @GetMapping("/{id}")
    public NoteDto get(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        return DtoMapper.toDto(noteService.getForRead(principal, id));
    }

    @PutMapping("/{id}")
    public NoteDto update(@AuthenticationPrincipal AppUserDetails principal,
                          @PathVariable Long id,
                          @Valid @RequestBody NoteForm form) {
        return DtoMapper.toDto(noteService.update(principal, id, form));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AppUserDetails principal, @PathVariable Long id) {
        noteService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
