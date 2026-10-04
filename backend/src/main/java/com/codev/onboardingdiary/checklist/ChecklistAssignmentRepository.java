package com.codev.onboardingdiary.checklist;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChecklistAssignmentRepository extends JpaRepository<ChecklistAssignment, Long> {

  List<ChecklistAssignment> findByRecruitIdOrderByCreatedAtAscIdAsc(Long recruitId);

  List<ChecklistAssignment> findByTemplateIdOrderByIdAsc(Long templateId);

  boolean existsByRecruitIdAndTemplateId(Long recruitId, Long templateId);

  long countByTemplateId(Long templateId);

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("update ChecklistAssignment a set a.templateId = null where a.templateId = :templateId")
  int detachTemplate(@Param("templateId") Long templateId);
}
