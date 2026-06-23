package com.onboardingdiary.repository;

import com.onboardingdiary.entity.NoteEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface NoteEntryRepository extends JpaRepository<NoteEntry, Long> {
    List<NoteEntry> findByUserIdOrderByDateDesc(Long userId);
    List<NoteEntry> findByUserIdAndDateBetween(Long userId, LocalDate from, LocalDate to);
    long countByUserId(Long userId);
    List<NoteEntry> findAllByOrderByDateDesc();
    List<NoteEntry> findAllByDateBetween(LocalDate from, LocalDate to);
}
