package com.codev.onboardingdiary.entry.feedback;

import com.codev.onboardingdiary.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Persistence for {@link FeedbackEntry}. */
public interface FeedbackRepository
    extends JpaRepository<FeedbackEntry, Long>, JpaSpecificationExecutor<FeedbackEntry> {

  Optional<FeedbackEntry> findByIdAndOwner(Long id, User owner);

  long countByOwner(User owner);

  List<FeedbackEntry> findTop10ByOwnerOrderByCreatedAtDesc(User owner);
}
