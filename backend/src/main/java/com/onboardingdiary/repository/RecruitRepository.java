package com.onboardingdiary.repository;

import com.onboardingdiary.entity.Recruit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RecruitRepository extends JpaRepository<Recruit, Long> {
    Optional<Recruit> findByEmail(String email);
}
