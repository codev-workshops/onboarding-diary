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
import java.util.List;
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

    @Query("SELECT t.status, COUNT(t) FROM Task t WHERE t.user.id = :userId GROUP BY t.status")
    List<Object[]> countByUserGroupByStatus(@Param("userId") UUID userId);

    @Query("SELECT t.category, COUNT(t) FROM Task t WHERE t.user.id = :userId GROUP BY t.category")
    List<Object[]> countByUserGroupByCategory(@Param("userId") UUID userId);

    @Query("SELECT t.priority, COUNT(t) FROM Task t WHERE t.user.id = :userId GROUP BY t.priority")
    List<Object[]> countByUserGroupByPriority(@Param("userId") UUID userId);

    @Query(value = "SELECT TO_CHAR(date_trunc('week', t.date), 'YYYY-MM-DD') AS week, COUNT(*) " +
            "FROM tasks t WHERE t.user_id = :userId AND t.date >= :since " +
            "GROUP BY week ORDER BY week", nativeQuery = true)
    List<Object[]> countWeeklyActivity(@Param("userId") UUID userId, @Param("since") LocalDate since);

    @Query(value = "SELECT * FROM tasks t WHERE t.user_id = :userId " +
            "AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(t.description) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY t.date DESC", nativeQuery = true)
    List<Task> search(@Param("userId") UUID userId, @Param("query") String query);
}
