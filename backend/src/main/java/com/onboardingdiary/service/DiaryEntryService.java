package com.onboardingdiary.service;

import com.onboardingdiary.dto.DiaryEntryRequest;
import com.onboardingdiary.dto.DiaryEntryResponse;
import com.onboardingdiary.model.DiaryEntry;
import com.onboardingdiary.model.User;
import com.onboardingdiary.repository.DiaryEntryRepository;
import com.onboardingdiary.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DiaryEntryService {

    private final DiaryEntryRepository entryRepository;
    private final UserRepository userRepository;

    public DiaryEntryService(DiaryEntryRepository entryRepository, UserRepository userRepository) {
        this.entryRepository = entryRepository;
        this.userRepository = userRepository;
    }

    public DiaryEntryResponse create(String username, DiaryEntryRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        DiaryEntry entry = new DiaryEntry(user, request.title(), request.content());
        entry.setPublic(request.isPublic());
        entry = entryRepository.save(entry);
        return DiaryEntryResponse.from(entry);
    }

    public List<DiaryEntryResponse> getMyEntries(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return entryRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(DiaryEntryResponse::from).toList();
    }

    public DiaryEntryResponse getById(Long id, String username) {
        DiaryEntry entry = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
        if (!entry.getUser().getUsername().equals(username) && !entry.isPublic()) {
            throw new SecurityException("Access denied");
        }
        return DiaryEntryResponse.from(entry);
    }

    public DiaryEntryResponse update(Long id, String username, DiaryEntryRequest request) {
        DiaryEntry entry = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
        if (!entry.getUser().getUsername().equals(username)) {
            throw new SecurityException("Access denied");
        }
        entry.setTitle(request.title());
        entry.setContent(request.content());
        entry.setPublic(request.isPublic());
        entry = entryRepository.save(entry);
        return DiaryEntryResponse.from(entry);
    }

    public void delete(Long id, String username) {
        DiaryEntry entry = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
        if (!entry.getUser().getUsername().equals(username)) {
            throw new SecurityException("Access denied");
        }
        entryRepository.delete(entry);
    }
}
