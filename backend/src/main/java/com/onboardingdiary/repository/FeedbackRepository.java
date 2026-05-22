package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.enums.FeedbackType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    @Query(value = "SELECT * FROM feedback f WHERE f.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR f.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR f.date <= :dateTo) " +
            "AND (CAST(:type AS VARCHAR) IS NULL OR f.type = CAST(:type AS VARCHAR)) " +
            "ORDER BY f.date DESC",
            countQuery = "SELECT COUNT(*) FROM feedback f WHERE f.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR f.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR f.date <= :dateTo) " +
            "AND (CAST(:type AS VARCHAR) IS NULL OR f.type = CAST(:type AS VARCHAR))",
            nativeQuery = true)
    Page<Feedback> findByUserWithFilters(@Param("userId") UUID userId,
                                         @Param("dateFrom") LocalDate dateFrom,
                                         @Param("dateTo") LocalDate dateTo,
                                         @Param("type") String type,
                                         Pageable pageable);

    long countByUserId(UUID userId);

    @Query("SELECT f.type, COUNT(f) FROM Feedback f WHERE f.user.id = :userId GROUP BY f.type")
    java.util.List<Object[]> countByUserGroupByType(@Param("userId") UUID userId);

    @Query(value = "SELECT TO_CHAR(date_trunc('week', f.date), 'YYYY-MM-DD') AS week, COUNT(*) " +
            "FROM feedback f WHERE f.user_id = :userId AND f.date >= :since " +
            "GROUP BY week ORDER BY week", nativeQuery = true)
    java.util.List<Object[]> countWeeklyActivity(@Param("userId") UUID userId, @Param("since") LocalDate since);

    @Query(value = "SELECT * FROM feedback f WHERE f.user_id = :userId " +
            "AND (LOWER(f.subject) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(f.details) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY f.date DESC", nativeQuery = true)
    java.util.List<Feedback> search(@Param("userId") UUID userId, @Param("query") String query);
}
