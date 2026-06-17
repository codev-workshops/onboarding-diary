package com.onboardingdiary.service;

import com.onboardingdiary.entity.Tag;
import com.onboardingdiary.repository.TagRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    public List<Tag> getAllTags() {
        return tagRepository.findAll();
    }

    public Tag findOrCreateTag(String name) {
        String normalized = name.trim();
        return tagRepository.findByName(normalized)
                .orElseGet(() -> tagRepository.save(new Tag(normalized)));
    }
}
