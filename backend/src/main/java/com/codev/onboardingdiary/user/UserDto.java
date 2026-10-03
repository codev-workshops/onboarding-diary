package com.codev.onboardingdiary.user;

import java.time.LocalDate;
import java.util.Set;

/** Public view of a user and their profile. */
public record UserDto(
    Long id, String email, Set<Role> roles, boolean mustChangePassword, ProfileDto profile) {

  public static UserDto from(User user, Profile profile, String managerName) {
    return new UserDto(
        user.getId(),
        user.getEmail(),
        user.getRoles(),
        user.isMustChangePassword(),
        ProfileDto.from(profile, managerName));
  }

  /** Profile fields exposed to the client. */
  public record ProfileDto(
      String fullName,
      String jobTitle,
      String department,
      LocalDate startDate,
      Long managerId,
      String managerEmail,
      String managerName) {

    static ProfileDto from(Profile profile, String managerName) {
      User manager = profile.getManager();
      return new ProfileDto(
          profile.getFullName(),
          profile.getJobTitle(),
          profile.getDepartment(),
          profile.getStartDate(),
          manager == null ? null : manager.getId(),
          manager == null ? null : manager.getEmail(),
          managerName);
    }
  }
}
