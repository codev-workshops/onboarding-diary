package com.codev.onboardingdiary.user;

/** System roles used for access control. */
public enum Role {
  RECRUIT,
  MANAGER,
  ADMIN;

  public String authority() {
    return "ROLE_" + name();
  }
}
