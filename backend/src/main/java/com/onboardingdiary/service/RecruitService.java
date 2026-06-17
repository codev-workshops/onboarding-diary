package com.onboardingdiary.service;

import com.onboardingdiary.entity.Recruit;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.RecruitRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecruitService {

    private final RecruitRepository recruitRepository;

    public RecruitService(RecruitRepository recruitRepository) {
        this.recruitRepository = recruitRepository;
    }

    public Recruit createRecruit(Recruit recruit) {
        return recruitRepository.save(recruit);
    }

    public Recruit getRecruitById(Long id) {
        return recruitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruit not found with id " + id));
    }

    public List<Recruit> getAllRecruits() {
        return recruitRepository.findAll();
    }
}
