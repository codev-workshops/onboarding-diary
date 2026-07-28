package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.NoteRequest;
import com.workshop.onboardingdiary.dto.NoteResponse;
import com.workshop.onboardingdiary.service.NoteService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Additional Note endpoints (REQUIREMENTS 4.5). */
@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<NoteResponse> list(Principal principal,
                                   @RequestParam(name = "userId", required = false) Long userId,
                                   @RequestParam(name = "tag", required = false) String tag,
                                   @RequestParam(name = "dateFrom", required = false)
                                   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
                                   @RequestParam(name = "dateTo", required = false)
                                   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return noteService.list(principal.getName(), userId, tag, dateFrom, dateTo);
    }

    @GetMapping("/{id}")
    public NoteResponse get(Principal principal, @PathVariable Long id) {
        return noteService.get(principal.getName(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse create(Principal principal, @Valid @RequestBody NoteRequest request) {
        return noteService.create(principal.getName(), request);
    }

    @PutMapping("/{id}")
    public NoteResponse update(Principal principal, @PathVariable Long id, @Valid @RequestBody NoteRequest request) {
        return noteService.update(principal.getName(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal principal, @PathVariable Long id) {
        noteService.delete(principal.getName(), id);
    }
}
