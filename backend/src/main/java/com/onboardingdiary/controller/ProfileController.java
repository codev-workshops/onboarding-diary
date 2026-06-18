package com.onboardingdiary.controller;

import com.onboardingdiary.dto.UpdateProfileRequest;
import com.onboardingdiary.dto.UserResponse;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-service profile endpoints for the authenticated user ("me").
 */
@RestController
@RequestMapping("/api/v1/me")
@Tag(name = "Profile")
public class ProfileController {

    private final UserService userService;

    public ProfileController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @Operation(summary = "Get the authenticated user's own profile")
    public UserResponse getProfile() {
        var caller = CurrentUser.require();
        return userService.get(caller, caller.id());
    }

    @PutMapping
    @Operation(summary = "Update the authenticated user's own profile (name and department)")
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateOwnProfile(CurrentUser.require(), request);
    }
}
