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

    @Query(value = "SELECT * FROM tasks t WHERE t.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR t.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR t.date <= :dateTo) " +
            "AND (CAST(:category AS VARCHAR) IS NULL OR t.category = CAST(:category AS VARCHAR)) " +
            "AND (CAST(:status AS VARCHAR) IS NULL OR t.status = CAST(:status AS VARCHAR)) " +
            "ORDER BY t.date DESC",
            countQuery = "SELECT COUNT(*) FROM tasks t WHERE t.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR t.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR t.date <= :dateTo) " +
            "AND (CAST(:category AS VARCHAR) IS NULL OR t.category = CAST(:category AS VARCHAR)) " +
            "AND (CAST(:status AS VARCHAR) IS NULL OR t.status = CAST(:status AS VARCHAR))",
            nativeQuery = true)
    Page<Task> findByUserWithFilters(@Param("userId") UUID userId,
                                     @Param("dateFrom") LocalDate dateFrom,
                                     @Param("dateTo") LocalDate dateTo,
                                     @Param("category") String category,
                                     @Param("status") String status,
                                     Pageable pageable);

    long countByUserId(UUID userId);

    long countByUserIdAndStatus(UUID userId, TaskStatus status);
}
