package com.codev.onboardingdiary.user;

/** Application roles. */
public enum Role {
  RECRUIT,
  MANAGER,
  ADMIN;

  public String authority() {
    return "ROLE_" + name();
  }
}
