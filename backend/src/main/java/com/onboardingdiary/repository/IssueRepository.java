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

    @Query("SELECT i FROM Issue i WHERE i.user.id = :userId " +
            "AND (:dateFrom IS NULL OR i.date >= :dateFrom) " +
            "AND (:dateTo IS NULL OR i.date <= :dateTo) " +
            "AND (:severity IS NULL OR i.severity = :severity) " +
            "AND (:status IS NULL OR i.status = :status) " +
            "ORDER BY i.date DESC")
    Page<Issue> findByUserWithFilters(@Param("userId") UUID userId,
                                      @Param("dateFrom") LocalDate dateFrom,
                                      @Param("dateTo") LocalDate dateTo,
                                      @Param("severity") IssueSeverity severity,
                                      @Param("status") IssueStatus status,
                                      Pageable pageable);

    long countByUserId(UUID userId);

    long countByUserIdAndStatusIn(UUID userId, java.util.Collection<IssueStatus> statuses);
}
