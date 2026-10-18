package com.codev.onboardingdiary.user;

/** Compact reference to a user, e.g. a recruit's manager. */
public record UserRef(Long id, String name) {

  public static UserRef of(User user) {
    return user == null ? null : new UserRef(user.getId(), user.getName());
  }
}
