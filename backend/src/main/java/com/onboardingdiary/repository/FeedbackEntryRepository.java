package com.onboardingdiary.repository;

import com.onboardingdiary.entity.FeedbackEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FeedbackEntryRepository extends JpaRepository<FeedbackEntry, Long> {
    List<FeedbackEntry> findByUserIdOrderByDateDesc(Long userId);
    List<FeedbackEntry> findByUserIdAndDateBetween(Long userId, LocalDate from, LocalDate to);
    long countByUserId(Long userId);
}
