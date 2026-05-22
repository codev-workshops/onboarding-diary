package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {

    @Query(value = "SELECT * FROM notes n WHERE n.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR n.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR n.date <= :dateTo) " +
            "ORDER BY n.date DESC",
            countQuery = "SELECT COUNT(*) FROM notes n WHERE n.user_id = :userId " +
            "AND (CAST(:dateFrom AS DATE) IS NULL OR n.date >= :dateFrom) " +
            "AND (CAST(:dateTo AS DATE) IS NULL OR n.date <= :dateTo)",
            nativeQuery = true)
    Page<Note> findByUserWithFilters(@Param("userId") UUID userId,
                                     @Param("dateFrom") LocalDate dateFrom,
                                     @Param("dateTo") LocalDate dateTo,
                                     Pageable pageable);

    long countByUserId(UUID userId);
}
