package com.onboardingdiary.controller;

import com.onboardingdiary.dto.NoteEntryRequest;
import com.onboardingdiary.entity.NoteEntry;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.service.NoteEntryService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NoteEntryController {

    private final NoteEntryService noteEntryService;
    private final UserRepository userRepository;

    public NoteEntryController(NoteEntryService noteEntryService, UserRepository userRepository) {
        this.noteEntryService = noteEntryService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<NoteEntry> create(@AuthenticationPrincipal UserDetails userDetails,
                                             @Valid @RequestBody NoteEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(noteEntryService.create(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<NoteEntry>> list(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String tag) {
        User user = getUser(userDetails);
        if (user.getRole() == Role.MANAGER || user.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(noteEntryService.getAll(dateFrom, dateTo, tag));
        }
        return ResponseEntity.ok(noteEntryService.getByUser(user.getId(), dateFrom, dateTo, tag));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteEntry> getById(@PathVariable Long id) {
        return ResponseEntity.ok(noteEntryService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteEntry> update(@AuthenticationPrincipal UserDetails userDetails,
                                             @PathVariable Long id,
                                             @Valid @RequestBody NoteEntryRequest request) {
        Long userId = getUserId(userDetails);
        return ResponseEntity.ok(noteEntryService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UserDetails userDetails,
                                        @PathVariable Long id) {
        Long userId = getUserId(userDetails);
        noteEntryService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    private User getUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Long getUserId(UserDetails userDetails) {
        return getUser(userDetails).getId();
    }
}
