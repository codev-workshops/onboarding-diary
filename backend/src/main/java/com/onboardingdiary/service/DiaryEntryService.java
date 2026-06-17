package com.onboardingdiary.service;

import com.onboardingdiary.entity.DiaryEntry;
import com.onboardingdiary.entity.Recruit;
import com.onboardingdiary.entity.Tag;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.DiaryEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class DiaryEntryService {

    private final DiaryEntryRepository diaryEntryRepository;
    private final RecruitService recruitService;
    private final TagService tagService;

    public DiaryEntryService(DiaryEntryRepository diaryEntryRepository,
                             RecruitService recruitService,
                             TagService tagService) {
        this.diaryEntryRepository = diaryEntryRepository;
        this.recruitService = recruitService;
        this.tagService = tagService;
    }

    @Transactional
    public DiaryEntry createEntry(Long recruitId, DiaryEntry entry, List<String> tagNames) {
        Recruit recruit = recruitService.getRecruitById(recruitId);
        entry.setRecruit(recruit);
        entry.setTags(resolveTags(tagNames));
        entry.setCreatedAt(LocalDateTime.now());
        entry.setUpdatedAt(LocalDateTime.now());
        return diaryEntryRepository.save(entry);
    }

    public List<DiaryEntry> getEntriesByRecruit(Long recruitId) {
        recruitService.getRecruitById(recruitId);
        return diaryEntryRepository.findByRecruitIdOrderByEntryDateDesc(recruitId);
    }

    public DiaryEntry getEntryById(Long id) {
        return diaryEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Diary entry not found with id " + id));
    }

    @Transactional
    public DiaryEntry updateEntry(Long id, DiaryEntry updated, List<String> tagNames) {
        DiaryEntry existing = getEntryById(id);
        existing.setTitle(updated.getTitle());
        existing.setContent(updated.getContent());
        existing.setMood(updated.getMood());
        existing.setEntryDate(updated.getEntryDate());
        if (tagNames != null) {
            existing.setTags(resolveTags(tagNames));
        }
        existing.setUpdatedAt(LocalDateTime.now());
        return diaryEntryRepository.save(existing);
    }

    public void deleteEntry(Long id) {
        DiaryEntry existing = getEntryById(id);
        diaryEntryRepository.delete(existing);
    }

    private Set<Tag> resolveTags(List<String> tagNames) {
        Set<Tag> tags = new HashSet<>();
        if (tagNames == null) {
            return tags;
        }
        for (String name : tagNames) {
            if (name != null && !name.trim().isEmpty()) {
                tags.add(tagService.findOrCreateTag(name));
            }
        }
        return tags;
    }
}
