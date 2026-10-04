package com.codev.onboardingdiary.profile;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.diary.DiaryEntries;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.UserDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

  private final ProfileRepository profileRepository;
  private final DiaryEntries diaryEntries;

  public ProfileService(ProfileRepository profileRepository, DiaryEntries diaryEntries) {
    this.profileRepository = profileRepository;
    this.diaryEntries = diaryEntries;
  }

  @Transactional(readOnly = true)
  public UserDto get(Long userId) {
    Profile profile = find(userId);
    return profileRepository.toUserDto(profile.getUser(), profile);
  }

  /**
   * Start date is locked once diary entries exist, because entry dates are validated against it.
   */
  @Transactional
  public UserDto update(Long userId, UpdateProfileRequest request) {
    Profile profile = find(userId);
    if (!request.startDate().equals(profile.getStartDate()) && diaryEntries.existFor(userId)) {
      throw ApiException.invalidField(
          "startDate", "Start date cannot be changed once you have diary entries");
    }
    profile.update(request.toProfileDetails());
    return profileRepository.toUserDto(profile.getUser(), profile);
  }

  private Profile find(Long userId) {
    return profileRepository
        .findById(userId)
        .orElseThrow(() -> ApiException.notFound("Profile not found"));
  }
}
