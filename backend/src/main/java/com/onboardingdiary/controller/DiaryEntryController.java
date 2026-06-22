package com.onboardingdiary.controller;

import com.onboardingdiary.dto.DiaryEntryRequest;
import com.onboardingdiary.dto.DiaryEntryResponse;
import com.onboardingdiary.service.DiaryEntryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/entries")
public class DiaryEntryController {

    private final DiaryEntryService entryService;

    public DiaryEntryController(DiaryEntryService entryService) {
        this.entryService = entryService;
    }

    @PostMapping
    public ResponseEntity<DiaryEntryResponse> create(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody DiaryEntryRequest request) {
        return ResponseEntity.ok(entryService.create(user.getUsername(), request));
    }

    @GetMapping
    public ResponseEntity<List<DiaryEntryResponse>> getMyEntries(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(entryService.getMyEntries(user.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DiaryEntryResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(entryService.getById(id, user.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DiaryEntryResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody DiaryEntryRequest request) {
        return ResponseEntity.ok(entryService.update(id, user.getUsername(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails user) {
        entryService.delete(id, user.getUsername());
        return ResponseEntity.noContent().build();
    }
}
