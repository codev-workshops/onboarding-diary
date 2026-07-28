package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.FeedbackNote;
import com.workshop.onboardingdiary.entity.FeedbackType;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackNoteRepository extends JpaRepository<FeedbackNote, Long> {

    /** Filters combine with AND semantics; a null filter is ignored (REQUIREMENTS 4.4). */
    @Query("""
            select f from FeedbackNote f
            where f.owner.id = :ownerId
              and (cast(:dateFrom as date) is null or f.entryDate >= :dateFrom)
              and (cast(:dateTo as date) is null or f.entryDate <= :dateTo)
              and (cast(:type as string) is null or f.type = :type)
            order by f.entryDate desc, f.createdAt desc, f.id desc
            """)
    List<FeedbackNote> search(@Param("ownerId") Long ownerId,
                              @Param("dateFrom") LocalDate dateFrom,
                              @Param("dateTo") LocalDate dateTo,
                              @Param("type") FeedbackType type);

    /**
     * Free-text search over the fields of REQUIREMENTS 9.2, matched case-insensitively anywhere in
     * the field. {@code q} is a pattern whose SQL wildcards are already escaped with {@code \}.
     */
    @Query("""
            select f from FeedbackNote f
            where f.owner.id = :ownerId
              and (lower(f.subject) like lower(concat('%', cast(:q as string), '%')) escape '\\'
                   or lower(f.details) like lower(concat('%', cast(:q as string), '%')) escape '\\')
            order by f.entryDate desc, f.createdAt desc, f.id desc
            """)
    List<FeedbackNote> searchText(@Param("ownerId") Long ownerId, @Param("q") String q, Pageable pageable);

    long countByOwnerId(Long ownerId);

    List<FeedbackNote> findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(Long ownerId, Pageable pageable);
}
