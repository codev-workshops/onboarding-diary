package com.codev.onboardingdiary.user;

/** Password rule shared by sign-up, password change and admin reset. */
public final class PasswordPolicy {

  /** 8-72 characters (BCrypt limit) with at least one letter and one digit. */
  public static final String REGEX = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$";

  public static final String MESSAGE =
      "must be 8-72 characters and contain at least one letter and one digit";

  private PasswordPolicy() {}
}
