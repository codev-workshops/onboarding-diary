package com.onboardingdiary.service;

import com.onboardingdiary.entity.Milestone;
import com.onboardingdiary.entity.Recruit;
import com.onboardingdiary.repository.MilestoneRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final RecruitService recruitService;

    public MilestoneService(MilestoneRepository milestoneRepository, RecruitService recruitService) {
        this.milestoneRepository = milestoneRepository;
        this.recruitService = recruitService;
    }

    public Milestone createMilestone(Long recruitId, Milestone milestone) {
        Recruit recruit = recruitService.getRecruitById(recruitId);
        milestone.setRecruit(recruit);
        return milestoneRepository.save(milestone);
    }

    public List<Milestone> getMilestonesByRecruit(Long recruitId) {
        recruitService.getRecruitById(recruitId);
        return milestoneRepository.findByRecruitId(recruitId);
    }
}
