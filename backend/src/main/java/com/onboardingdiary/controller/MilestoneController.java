package com.onboardingdiary.controller;

import com.onboardingdiary.entity.Milestone;
import com.onboardingdiary.service.MilestoneService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class MilestoneController {

    private final MilestoneService milestoneService;

    public MilestoneController(MilestoneService milestoneService) {
        this.milestoneService = milestoneService;
    }

    @PostMapping("/recruits/{recruitId}/milestones")
    public ResponseEntity<Milestone> createMilestone(@PathVariable Long recruitId,
                                                     @Valid @RequestBody Milestone milestone) {
        Milestone created = milestoneService.createMilestone(recruitId, milestone);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/recruits/{recruitId}/milestones")
    public List<Milestone> getMilestonesByRecruit(@PathVariable Long recruitId) {
        return milestoneService.getMilestonesByRecruit(recruitId);
    }
}
