package com.codev.onboardingdiary.issue;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface IssueRepository
    extends JpaRepository<Issue, Long>, JpaSpecificationExecutor<Issue> {

  Optional<Issue> findByIdAndOwnerId(Long id, Long ownerId);

  boolean existsByOwnerId(Long ownerId);
}
