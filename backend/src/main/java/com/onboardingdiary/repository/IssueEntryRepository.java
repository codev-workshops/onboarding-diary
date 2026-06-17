package com.onboardingdiary.repository;

import com.onboardingdiary.entity.IssueEntry;
import com.onboardingdiary.entity.enums.IssueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface IssueEntryRepository extends JpaRepository<IssueEntry, Long> {
    List<IssueEntry> findByUserIdOrderByDateDesc(Long userId);
    List<IssueEntry> findByUserIdAndDateBetween(Long userId, LocalDate from, LocalDate to);
    long countByUserIdAndStatus(Long userId, IssueStatus status);
    long countByUserId(Long userId);
}
