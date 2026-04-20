package com.onboarding.diary.repository;

import com.onboarding.diary.entity.IssueEntry;
import com.onboarding.diary.entity.IssueStatus;
import com.onboarding.diary.entity.Severity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueEntryRepository extends JpaRepository<IssueEntry, String> {

    Page<IssueEntry> findByUserIdAndDeletedFalse(String userId, Pageable pageable);

    long countByUserIdAndDeletedFalse(String userId);

    long countByUserIdAndStatusAndDeletedFalse(String userId, IssueStatus status);

    List<IssueEntry> findByUserIdAndDateBetweenAndDeletedFalse(String userId, String dateFrom, String dateTo);

    Optional<IssueEntry> findByIdAndDeletedFalse(String id);

    Page<IssueEntry> findByUserIdAndStatusAndDeletedFalse(String userId, IssueStatus status, Pageable pageable);

    Page<IssueEntry> findByUserIdAndSeverityAndDeletedFalse(String userId, Severity severity, Pageable pageable);

    Page<IssueEntry> findByUserIdAndSeverityAndStatusAndDeletedFalse(String userId, Severity severity, IssueStatus status, Pageable pageable);

    @Query("SELECT i FROM IssueEntry i WHERE i.userId = :userId AND i.deleted = false ORDER BY i.createdAt DESC")
    List<IssueEntry> findRecentByUserId(@Param("userId") String userId, Pageable pageable);

    long countByUserIdAndSeverityAndDeletedFalse(String userId, Severity severity);
}
