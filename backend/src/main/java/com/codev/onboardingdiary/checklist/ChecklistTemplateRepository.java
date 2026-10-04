package com.codev.onboardingdiary.checklist;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistTemplateRepository extends JpaRepository<ChecklistTemplate, Long> {

  List<ChecklistTemplate> findAllByOrderByNameAsc();

  boolean existsByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
