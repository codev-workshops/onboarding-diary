package com.codev.onboardingdiary.profile;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.UserDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

  private final ProfileRepository profileRepository;

  public ProfileService(ProfileRepository profileRepository) {
    this.profileRepository = profileRepository;
  }

  @Transactional(readOnly = true)
  public UserDto get(Long userId) {
    Profile profile = find(userId);
    return profileRepository.toUserDto(profile.getUser(), profile);
  }

  @Transactional
  public UserDto update(Long userId, UpdateProfileRequest request) {
    Profile profile = find(userId);
    profile.update(request.toProfileDetails());
    return profileRepository.toUserDto(profile.getUser(), profile);
  }

  private Profile find(Long userId) {
    return profileRepository
        .findById(userId)
        .orElseThrow(() -> ApiException.notFound("Profile not found"));
  }
}
