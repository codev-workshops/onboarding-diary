package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Checklists assigned to recruits. */
public interface RecruitChecklistRepository extends JpaRepository<RecruitChecklist, Long> {

  List<RecruitChecklist> findByRecruitOrderByAssignedAtAscIdAsc(User recruit);

  Optional<RecruitChecklist> findByIdAndRecruit(Long id, User recruit);
}
