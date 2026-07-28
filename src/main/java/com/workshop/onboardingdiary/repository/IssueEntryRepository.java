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

    /**
     * Free-text search over the fields of REQUIREMENTS 9.2, matched case-insensitively anywhere in
     * the field. {@code q} is a pattern whose SQL wildcards are already escaped with {@code \}.
     */
    @Query("""
            select i from IssueEntry i
            where i.owner.id = :ownerId
              and (lower(i.title) like lower(concat('%', cast(:q as string), '%')) escape '\\'
                   or lower(i.description) like lower(concat('%', cast(:q as string), '%')) escape '\\'
                   or lower(i.resolutionNotes) like lower(concat('%', cast(:q as string), '%')) escape '\\')
            order by i.entryDate desc, i.createdAt desc, i.id desc
            """)
    List<IssueEntry> searchText(@Param("ownerId") Long ownerId, @Param("q") String q, Pageable pageable);

    long countByOwnerId(Long ownerId);

    /** Team-wide count over the manager's recruits (REQUIREMENTS 10.2). */
    long countByOwnerIdIn(Collection<Long> ownerIds);

    /** The latest issue entry date per recruit, for the inactivity check (REQUIREMENTS 10.2). */
    @Query("""
            select i.owner.id as recruitId, max(i.entryDate) as lastEntryDate
            from IssueEntry i
            where i.owner.id in :ownerIds
            group by i.owner.id
            """)
    List<RecruitLastEntryDate> findLastEntryDates(@Param("ownerIds") Collection<Long> ownerIds);

    /**
     * Per-recruit count of still-open high-priority issues for the manager dashboard's attention
     * list (REQUIREMENTS 10.2); only recruits with at least one such issue are returned.
     */
    @Query("""
            select i.owner.id as recruitId, count(i) as openCount
            from IssueEntry i
            where i.owner.id in :ownerIds
              and i.severity in :severities
              and i.status in :statuses
            group by i.owner.id
            """)
    List<RecruitOpenIssueCount> countOpenHighPriorityByRecruit(@Param("ownerIds") Collection<Long> ownerIds,
                                                               @Param("severities") Collection<IssueSeverity> severities,
                                                               @Param("statuses") Collection<IssueStatus> statuses);

    /** Dashboard open issues are the ones still OPEN or IN_PROGRESS (REQUIREMENTS 4.6). */
    List<IssueEntry> findByOwnerIdAndStatusInOrderByEntryDateDescCreatedAtDescIdDesc(
            Long ownerId, Collection<IssueStatus> statuses);

    List<IssueEntry> findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(Long ownerId, Pageable pageable);
}
