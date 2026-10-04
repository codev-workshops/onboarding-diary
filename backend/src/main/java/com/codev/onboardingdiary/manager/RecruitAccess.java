package com.codev.onboardingdiary.manager;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Decides whether a manager or admin may read a given recruit's diary. */
@Component
public class RecruitAccess {

  private final ProfileRepository profileRepository;

  public RecruitAccess(ProfileRepository profileRepository) {
    this.profileRepository = profileRepository;
  }

  /**
   * Returns the recruit's profile if {@code viewer} is an admin or the recruit's manager. Managers
   * get 403 for anyone else, without revealing whether the user exists.
   */
  @Transactional(readOnly = true)
  public Profile require(AuthenticatedUser viewer, Long recruitId) {
    Profile profile = profileRepository.findById(recruitId).orElse(null);
    if (viewer.hasRole(Role.ADMIN)) {
      if (profile == null) {
        throw ApiException.notFound("User not found");
      }
      return profile;
    }
    User manager = profile == null ? null : profile.getManager();
    if (manager == null || !manager.getId().equals(viewer.id())) {
      throw ApiException.forbidden("You can only view recruits assigned to you");
    }
    return profile;
  }

  /** True if {@code viewer} may read the recruit's diary; never throws. */
  @Transactional(readOnly = true)
  public boolean canView(AuthenticatedUser viewer, Long recruitId) {
    try {
      require(viewer, recruitId);
      return true;
    } catch (ApiException ex) {
      return false;
    }
  }
}
