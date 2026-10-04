package com.codev.onboardingdiary.issue;

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

public interface IssueRepository
    extends JpaRepository<Issue, Long>, JpaSpecificationExecutor<Issue> {

  Optional<Issue> findByIdAndOwnerId(Long id, Long ownerId);

  boolean existsByOwnerId(Long ownerId);

  Page<Issue> findByOwnerId(Long ownerId, Pageable pageable);

  List<Issue> findByOwnerIdAndStatusIn(Long ownerId, Collection<IssueStatus> statuses);

  @Query("select max(i.updatedAt) from Issue i where i.ownerId = :ownerId")
  Instant findLastUpdatedAt(@Param("ownerId") Long ownerId);

  List<Issue> findByOwnerIdInAndEntryDateBetweenOrderByOwnerIdAscEntryDateAscIdAsc(
      Collection<Long> ownerIds, LocalDate from, LocalDate to);
}
