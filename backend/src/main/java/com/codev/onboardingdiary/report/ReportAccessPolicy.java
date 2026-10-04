package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.manager.RecruitAccess;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.Role;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Decides whose data a report may include: recruits only themselves, managers their assigned
 * recruits, admins anyone.
 */
@Component
public class ReportAccessPolicy {

  private final ProfileRepository profileRepository;
  private final RecruitAccess recruitAccess;

  public ReportAccessPolicy(ProfileRepository profileRepository, RecruitAccess recruitAccess) {
    this.profileRepository = profileRepository;
    this.recruitAccess = recruitAccess;
  }

  public List<Profile> subjects(AuthenticatedUser viewer, ReportScope scope, Long userId) {
    return switch (scope) {
      case SELF -> List.of(self(viewer, userId));
      case TEAM -> {
        if (!viewer.hasRole(Role.MANAGER) && !viewer.hasRole(Role.ADMIN)) {
          throw ApiException.forbidden("Team reports are available to managers only");
        }
        yield profileRepository.findByManager_IdOrderByFullNameAsc(viewer.id());
      }
      case ALL -> {
        if (!viewer.hasRole(Role.ADMIN)) {
          throw ApiException.forbidden("Organisation-wide reports are available to admins only");
        }
        yield profileRepository.findByRole(Role.RECRUIT);
      }
    };
  }

  private Profile self(AuthenticatedUser viewer, Long userId) {
    if (userId == null || userId.equals(viewer.id())) {
      return profileRepository
          .findById(viewer.id())
          .orElseThrow(() -> ApiException.notFound("Profile not found"));
    }
    if (!viewer.hasRole(Role.MANAGER) && !viewer.hasRole(Role.ADMIN)) {
      throw ApiException.forbidden("You can only generate reports for yourself");
    }
    return recruitAccess.require(viewer, userId);
  }
}
