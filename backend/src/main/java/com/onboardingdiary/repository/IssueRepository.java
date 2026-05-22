package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.enums.IssueSeverity;
import com.onboardingdiary.enums.IssueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface IssueRepository extends JpaRepository<Issue, UUID> {

    @Query(value = "SELECT * FROM issues i WHERE i.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR i.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR i.date <= :dateTo) " +
            "AND (CAST(:severity AS VARCHAR) IS NULL OR i.severity = CAST(:severity AS VARCHAR)) " +
            "AND (CAST(:status AS VARCHAR) IS NULL OR i.status = CAST(:status AS VARCHAR)) " +
            "ORDER BY i.date DESC",
            countQuery = "SELECT COUNT(*) FROM issues i WHERE i.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR i.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR i.date <= :dateTo) " +
            "AND (CAST(:severity AS VARCHAR) IS NULL OR i.severity = CAST(:severity AS VARCHAR)) " +
            "AND (CAST(:status AS VARCHAR) IS NULL OR i.status = CAST(:status AS VARCHAR))",
            nativeQuery = true)
    Page<Issue> findByUserWithFilters(@Param("userId") UUID userId,
                                      @Param("dateFrom") LocalDate dateFrom,
                                      @Param("dateTo") LocalDate dateTo,
                                      @Param("severity") String severity,
                                      @Param("status") String status,
                                      Pageable pageable);

    long countByUserId(UUID userId);

    long countByUserIdAndStatusIn(UUID userId, java.util.Collection<IssueStatus> statuses);

    @Query("SELECT i.severity, COUNT(i) FROM Issue i WHERE i.user.id = :userId GROUP BY i.severity")
    java.util.List<Object[]> countByUserGroupBySeverity(@Param("userId") UUID userId);

    @Query("SELECT i.status, COUNT(i) FROM Issue i WHERE i.user.id = :userId GROUP BY i.status")
    java.util.List<Object[]> countByUserGroupByStatus(@Param("userId") UUID userId);

    @Query(value = "SELECT TO_CHAR(date_trunc('week', i.date), 'YYYY-MM-DD') AS week, COUNT(*) " +
            "FROM issues i WHERE i.user_id = :userId AND i.date >= :since " +
            "GROUP BY week ORDER BY week", nativeQuery = true)
    java.util.List<Object[]> countWeeklyActivity(@Param("userId") UUID userId, @Param("since") LocalDate since);

    @Query(value = "SELECT * FROM issues i WHERE i.user_id = :userId " +
            "AND (LOWER(i.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(i.description) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(i.resolution_notes) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY i.date DESC", nativeQuery = true)
    java.util.List<Issue> search(@Param("userId") UUID userId, @Param("query") String query);
}
