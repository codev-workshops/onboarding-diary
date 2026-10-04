package com.codev.onboardingdiary.task;

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

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

  Optional<Task> findByIdAndOwnerId(Long id, Long ownerId);

  boolean existsByOwnerId(Long ownerId);

  Page<Task> findByOwnerId(Long ownerId, Pageable pageable);

  @Query("select t.status, count(t) from Task t where t.ownerId = :ownerId group by t.status")
  List<Object[]> countByStatus(@Param("ownerId") Long ownerId);

  @Query(
      "select t.completedAt from Task t where t.ownerId = :ownerId"
          + " and t.completedAt is not null and t.completedAt >= :since")
  List<Instant> findCompletedAtSince(@Param("ownerId") Long ownerId, @Param("since") Instant since);

  @Query("select max(t.updatedAt) from Task t where t.ownerId = :ownerId")
  Instant findLastUpdatedAt(@Param("ownerId") Long ownerId);

  List<Task> findByOwnerIdInAndEntryDateBetweenOrderByOwnerIdAscEntryDateAscIdAsc(
      Collection<Long> ownerIds, LocalDate from, LocalDate to);
}
