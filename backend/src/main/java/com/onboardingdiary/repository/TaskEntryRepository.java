package com.onboardingdiary.repository;

import com.onboardingdiary.entity.TaskEntry;
import com.onboardingdiary.entity.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaskEntryRepository extends JpaRepository<TaskEntry, Long> {
    List<TaskEntry> findByUserIdOrderByDateDesc(Long userId);
    List<TaskEntry> findByUserIdAndDateBetween(Long userId, LocalDate from, LocalDate to);
    long countByUserIdAndStatus(Long userId, TaskStatus status);
    long countByUserId(Long userId);
}
