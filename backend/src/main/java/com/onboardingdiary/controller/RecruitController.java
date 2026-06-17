package com.onboardingdiary.controller;

import com.onboardingdiary.entity.Recruit;
import com.onboardingdiary.service.RecruitService;
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
@RequestMapping("/api/recruits")
public class RecruitController {

    private final RecruitService recruitService;

    public RecruitController(RecruitService recruitService) {
        this.recruitService = recruitService;
    }

    @PostMapping
    public ResponseEntity<Recruit> createRecruit(@Valid @RequestBody Recruit recruit) {
        Recruit created = recruitService.createRecruit(recruit);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public List<Recruit> getAllRecruits() {
        return recruitService.getAllRecruits();
    }

    @GetMapping("/{id}")
    public Recruit getRecruitById(@PathVariable Long id) {
        return recruitService.getRecruitById(id);
    }
}
