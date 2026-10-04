package com.codev.onboardingdiary.feedback;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface FeedbackRepository
    extends JpaRepository<Feedback, Long>, JpaSpecificationExecutor<Feedback> {

  Optional<Feedback> findByIdAndOwnerId(Long id, Long ownerId);

  boolean existsByOwnerId(Long ownerId);
}
