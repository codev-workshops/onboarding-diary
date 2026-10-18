package com.codev.onboardingdiary.user;

import java.time.Instant;
import java.time.LocalDate;

/** Public representation of a user. Never exposes the password hash. */
public record UserDto(
    Long id,
    String email,
    String name,
    Role role,
    String department,
    LocalDate startDate,
    UserRef manager,
    boolean active,
    Instant createdAt) {

  public static UserDto of(User user) {
    return new UserDto(
        user.getId(),
        user.getEmail(),
        user.getName(),
        user.getRole(),
        user.getDepartment(),
        user.getStartDate(),
        UserRef.of(user.getManager()),
        user.isActive(),
        user.getCreatedAt());
  }
}
