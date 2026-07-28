package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.TaskCategory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskCategoryRepository extends JpaRepository<TaskCategory, Long> {

    Optional<TaskCategory> findByNameIgnoreCase(String name);
}
