package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Task;
import com.onboardingdiary.enums.TaskCategory;
import com.onboardingdiary.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId " +
            "AND (:dateFrom IS NULL OR t.date >= :dateFrom) " +
            "AND (:dateTo IS NULL OR t.date <= :dateTo) " +
            "AND (:category IS NULL OR t.category = :category) " +
            "AND (:status IS NULL OR t.status = :status) " +
            "ORDER BY t.date DESC")
    Page<Task> findByUserWithFilters(@Param("userId") UUID userId,
                                     @Param("dateFrom") LocalDate dateFrom,
                                     @Param("dateTo") LocalDate dateTo,
                                     @Param("category") TaskCategory category,
                                     @Param("status") TaskStatus status,
                                     Pageable pageable);

    long countByUserId(UUID userId);

    long countByUserIdAndStatus(UUID userId, TaskStatus status);
}
