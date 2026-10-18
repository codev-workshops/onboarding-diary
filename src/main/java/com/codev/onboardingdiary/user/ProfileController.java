package com.codev.onboardingdiary.user;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The logged-in user's profile. */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  @GetMapping
  UserDto get() {
    return profileService.get();
  }

  @PutMapping
  UserDto update(@Valid @RequestBody ProfileUpdateRequest request) {
    return profileService.update(request);
  }

  @PutMapping("/password")
  ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
    profileService.changePassword(request);
    return ResponseEntity.noContent().build();
  }
}
