package com.codev.onboardingdiary.entry.issue;

import com.codev.onboardingdiary.user.User;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Persistence for {@link IssueEntry}. */
public interface IssueRepository
    extends JpaRepository<IssueEntry, Long>, JpaSpecificationExecutor<IssueEntry> {

  Optional<IssueEntry> findByIdAndOwner(Long id, User owner);

  long countByOwner(User owner);

  long countByOwnerAndStatusIn(User owner, Collection<IssueStatus> statuses);

  List<IssueEntry> findByOwnerAndStatusIn(User owner, Collection<IssueStatus> statuses);

  List<IssueEntry> findTop10ByOwnerOrderByCreatedAtDesc(User owner);
}
