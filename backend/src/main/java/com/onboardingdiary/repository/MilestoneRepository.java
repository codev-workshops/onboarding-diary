package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    List<Milestone> findByRecruitId(Long recruitId);
}
