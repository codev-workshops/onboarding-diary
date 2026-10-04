package com.codev.onboardingdiary.feedback;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackRepository
    extends JpaRepository<Feedback, Long>, JpaSpecificationExecutor<Feedback> {

  Optional<Feedback> findByIdAndOwnerId(Long id, Long ownerId);

  boolean existsByOwnerId(Long ownerId);

  Page<Feedback> findByOwnerId(Long ownerId, Pageable pageable);

  @Query("select f.type, count(f) from Feedback f where f.ownerId = :ownerId group by f.type")
  List<Object[]> countByType(@Param("ownerId") Long ownerId);

  @Query("select max(f.updatedAt) from Feedback f where f.ownerId = :ownerId")
  Instant findLastUpdatedAt(@Param("ownerId") Long ownerId);

  List<Feedback> findByOwnerIdInAndEntryDateBetweenOrderByOwnerIdAscEntryDateAscIdAsc(
      Collection<Long> ownerIds, LocalDate from, LocalDate to);
}
