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

    @Query(value = "SELECT TO_CHAR(date_trunc('week', n.date), 'YYYY-MM-DD') AS week, COUNT(*) " +
            "FROM notes n WHERE n.user_id = :userId AND n.date >= :since " +
            "GROUP BY week ORDER BY week", nativeQuery = true)
    java.util.List<Object[]> countWeeklyActivity(@Param("userId") UUID userId, @Param("since") LocalDate since);

    @Query(value = "SELECT * FROM notes n WHERE n.user_id = :userId " +
            "AND (LOWER(n.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(n.content) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(n.tags) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY n.date DESC", nativeQuery = true)
    java.util.List<Note> search(@Param("userId") UUID userId, @Param("query") String query);
}
