package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.ProfileResponse;
import com.workshop.onboardingdiary.dto.UpdateProfileRequest;
import com.workshop.onboardingdiary.service.ProfileService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Profile of the authenticated user (REQUIREMENTS 4.1, US-R03). */
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final ProfileService profileService;

    public MeController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileResponse getProfile(Principal principal) {
        return profileService.getCurrentProfile(principal.getName());
    }

    @PutMapping
    public ProfileResponse updateProfile(Principal principal, @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.updateProfile(principal.getName(), request);
    }
}
