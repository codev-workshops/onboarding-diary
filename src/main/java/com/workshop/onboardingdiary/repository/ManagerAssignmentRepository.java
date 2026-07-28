package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.ManagerAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManagerAssignmentRepository extends JpaRepository<ManagerAssignment, Long> {

    boolean existsByManagerIdAndRecruitId(Long managerId, Long recruitId);
}
