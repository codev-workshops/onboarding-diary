package com.onboardingdiary.controller;

import com.onboardingdiary.dto.DiaryEntryRequest;
import com.onboardingdiary.entity.DiaryEntry;
import com.onboardingdiary.service.DiaryEntryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class DiaryEntryController {

    private final DiaryEntryService diaryEntryService;

    public DiaryEntryController(DiaryEntryService diaryEntryService) {
        this.diaryEntryService = diaryEntryService;
    }

    @PostMapping("/recruits/{recruitId}/entries")
    public ResponseEntity<DiaryEntry> createEntry(@PathVariable Long recruitId,
                                                  @Valid @RequestBody DiaryEntryRequest request) {
        DiaryEntry created = diaryEntryService.createEntry(recruitId, toEntity(request), request.getTags());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/recruits/{recruitId}/entries")
    public List<DiaryEntry> getEntriesByRecruit(@PathVariable Long recruitId) {
        return diaryEntryService.getEntriesByRecruit(recruitId);
    }

    @GetMapping("/entries/{id}")
    public DiaryEntry getEntry(@PathVariable Long id) {
        return diaryEntryService.getEntryById(id);
    }

    @PutMapping("/entries/{id}")
    public DiaryEntry updateEntry(@PathVariable Long id,
                                  @Valid @RequestBody DiaryEntryRequest request) {
        return diaryEntryService.updateEntry(id, toEntity(request), request.getTags());
    }

    @DeleteMapping("/entries/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long id) {
        diaryEntryService.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }

    private DiaryEntry toEntity(DiaryEntryRequest request) {
        DiaryEntry entry = new DiaryEntry();
        entry.setTitle(request.getTitle());
        entry.setContent(request.getContent());
        entry.setMood(request.getMood());
        entry.setEntryDate(request.getEntryDate());
        return entry;
    }
}
