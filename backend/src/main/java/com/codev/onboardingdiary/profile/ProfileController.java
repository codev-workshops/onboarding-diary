package com.codev.onboardingdiary.profile;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.user.UserDto;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  @GetMapping
  public UserDto get(@AuthenticationPrincipal AuthenticatedUser principal) {
    return profileService.get(principal.id());
  }

  @PutMapping
  public UserDto update(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody UpdateProfileRequest request) {
    return profileService.update(principal.id(), request);
  }
}
