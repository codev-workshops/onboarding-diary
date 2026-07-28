package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.TaskEntry;
import com.workshop.onboardingdiary.entity.TaskStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskEntryRepository extends JpaRepository<TaskEntry, Long> {

    /** Filters combine with AND semantics; a null filter is ignored (REQUIREMENTS 4.2, US-R05). */
    @Query("""
            select t from TaskEntry t
            where t.owner.id = :ownerId
              and (cast(:dateFrom as date) is null or t.entryDate >= :dateFrom)
              and (cast(:dateTo as date) is null or t.entryDate <= :dateTo)
              and (cast(:categoryId as long) is null or t.category.id = :categoryId)
              and (cast(:status as string) is null or t.status = :status)
            order by t.entryDate desc, t.createdAt desc, t.id desc
            """)
    List<TaskEntry> search(@Param("ownerId") Long ownerId,
                           @Param("dateFrom") LocalDate dateFrom,
                           @Param("dateTo") LocalDate dateTo,
                           @Param("categoryId") Long categoryId,
                           @Param("status") TaskStatus status);

    long countByOwnerId(Long ownerId);

    long countByOwnerIdAndStatus(Long ownerId, TaskStatus status);

    List<TaskEntry> findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(Long ownerId, Pageable pageable);
}
