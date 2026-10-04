package com.codev.onboardingdiary.checklist;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {

  Optional<ChecklistItem> findByIdAndAssignment_IdAndAssignment_RecruitId(
      Long id, Long assignmentId, Long recruitId);

  long countByAssignment_RecruitId(Long recruitId);

  long countByAssignment_RecruitIdAndCompletedAtIsNotNull(Long recruitId);
}
