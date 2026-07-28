package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.AdditionalNote;
import java.time.LocalDate;
import java.util.Collection;
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
              and (cast(:dateFrom as date) is null or n.entryDate >= :dateFrom)
              and (cast(:dateTo as date) is null or n.entryDate <= :dateTo)
              and (cast(:tag as string) is null or :tag member of n.tags)
            order by n.entryDate desc, n.createdAt desc, n.id desc
            """)
    List<AdditionalNote> search(@Param("ownerId") Long ownerId,
                                @Param("dateFrom") LocalDate dateFrom,
                                @Param("dateTo") LocalDate dateTo,
                                @Param("tag") String tag);

    /**
     * Free-text search over the fields of REQUIREMENTS 9.2, matched case-insensitively anywhere in
     * the field, tag values included. The tag join makes {@code distinct} necessary so a note whose
     * several tags match is returned once. Tags are stored already lower-cased, but the comparison
     * still lower-cases the column so it matches the {@code lower(tag)} trigram index. {@code q} is a
     * pattern whose SQL wildcards are already escaped with {@code \}.
     */
    @Query("""
            select distinct n from AdditionalNote n
            left join n.tags tag
            where n.owner.id = :ownerId
              and (lower(n.title) like lower(concat('%', cast(:q as string), '%')) escape '\\'
                   or lower(n.content) like lower(concat('%', cast(:q as string), '%')) escape '\\'
                   or lower(tag) like lower(concat('%', cast(:q as string), '%')) escape '\\')
            order by n.entryDate desc, n.createdAt desc, n.id desc
            """)
    List<AdditionalNote> searchText(@Param("ownerId") Long ownerId, @Param("q") String q, Pageable pageable);

    long countByOwnerId(Long ownerId);

    /** Team-wide count over the manager's recruits (REQUIREMENTS 10.2). */
    long countByOwnerIdIn(Collection<Long> ownerIds);

    /** The latest additional note entry date per recruit, for the inactivity check (REQUIREMENTS 10.2). */
    @Query("""
            select n.owner.id as recruitId, max(n.entryDate) as lastEntryDate
            from AdditionalNote n
            where n.owner.id in :ownerIds
            group by n.owner.id
            """)
    List<RecruitLastEntryDate> findLastEntryDates(@Param("ownerIds") Collection<Long> ownerIds);

    List<AdditionalNote> findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(Long ownerId, Pageable pageable);
}
