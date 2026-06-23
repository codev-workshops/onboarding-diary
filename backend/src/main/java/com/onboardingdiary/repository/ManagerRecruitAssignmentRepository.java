package com.onboardingdiary.repository;

import com.onboardingdiary.entity.ManagerRecruitAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManagerRecruitAssignmentRepository extends JpaRepository<ManagerRecruitAssignment, Long> {
    List<ManagerRecruitAssignment> findByManagerId(Long managerId);
    List<ManagerRecruitAssignment> findByRecruitId(Long recruitId);
    boolean existsByManagerIdAndRecruitId(Long managerId, Long recruitId);
}
