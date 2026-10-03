package com.codev.onboardingdiary.auth;

/** Password rules shared by all endpoints that accept a new password. */
public final class PasswordPolicy {

  /** 8–72 characters (BCrypt limit) with at least one lower-case, upper-case letter and digit. */
  public static final String REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$";

  public static final String MESSAGE =
      "must be 8-72 characters and contain an upper-case letter, a lower-case letter and a digit";

  private PasswordPolicy() {}
}
