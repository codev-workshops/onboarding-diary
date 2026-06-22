package com.onboardingdiary.repository;

import com.onboardingdiary.model.DiaryEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DiaryEntryRepository extends JpaRepository<DiaryEntry, Long> {

    List<DiaryEntry> findByUserIdOrderByCreatedAtDesc(Long userId);
}
