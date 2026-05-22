package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.enums.FeedbackType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    @Query("SELECT f FROM Feedback f WHERE f.user.id = :userId " +
            "AND (:dateFrom IS NULL OR f.date >= :dateFrom) " +
            "AND (:dateTo IS NULL OR f.date <= :dateTo) " +
            "AND (:type IS NULL OR f.type = :type) " +
            "ORDER BY f.date DESC")
    Page<Feedback> findByUserWithFilters(@Param("userId") UUID userId,
                                         @Param("dateFrom") LocalDate dateFrom,
                                         @Param("dateTo") LocalDate dateTo,
                                         @Param("type") FeedbackType type,
                                         Pageable pageable);

    long countByUserId(UUID userId);
}
