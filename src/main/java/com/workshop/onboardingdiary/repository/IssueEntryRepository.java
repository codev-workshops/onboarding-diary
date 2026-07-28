package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IssueEntryRepository extends JpaRepository<IssueEntry, Long> {

    /** Filters combine with AND semantics; a null filter is ignored (REQUIREMENTS 4.3, US-R07). */
    @Query("""
            select i from IssueEntry i
            where i.owner.id = :ownerId
              and (cast(:dateFrom as date) is null or i.entryDate >= :dateFrom)
              and (cast(:dateTo as date) is null or i.entryDate <= :dateTo)
              and (cast(:status as string) is null or i.status = :status)
              and (cast(:severity as string) is null or i.severity = :severity)
            order by i.entryDate desc, i.createdAt desc, i.id desc
            """)
    List<IssueEntry> search(@Param("ownerId") Long ownerId,
                            @Param("dateFrom") LocalDate dateFrom,
                            @Param("dateTo") LocalDate dateTo,
                            @Param("status") IssueStatus status,
                            @Param("severity") IssueSeverity severity);

    long countByOwnerId(Long ownerId);

    /** Dashboard open issues are the ones still OPEN or IN_PROGRESS (REQUIREMENTS 4.6). */
    List<IssueEntry> findByOwnerIdAndStatusInOrderByEntryDateDescCreatedAtDescIdDesc(
            Long ownerId, Collection<IssueStatus> statuses);

    List<IssueEntry> findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(Long ownerId, Pageable pageable);
}
