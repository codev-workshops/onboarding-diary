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
}
