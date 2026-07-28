package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.AdditionalNote;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdditionalNoteRepository extends JpaRepository<AdditionalNote, Long> {

    /**
     * Filters combine with AND semantics; a null filter is ignored. The {@code tag} filter is
     * matched against the normalised stored tags (REQUIREMENTS 4.5, US-R09).
     */
    @Query("""
            select n from AdditionalNote n
            where n.owner.id = :ownerId
              and (:dateFrom is null or n.entryDate >= :dateFrom)
              and (:dateTo is null or n.entryDate <= :dateTo)
              and (:tag is null or :tag member of n.tags)
            order by n.entryDate desc, n.createdAt desc, n.id desc
            """)
    List<AdditionalNote> search(@Param("ownerId") Long ownerId,
                                @Param("dateFrom") LocalDate dateFrom,
                                @Param("dateTo") LocalDate dateTo,
                                @Param("tag") String tag);

    long countByOwnerId(Long ownerId);

    List<AdditionalNote> findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(Long ownerId, Pageable pageable);
}
