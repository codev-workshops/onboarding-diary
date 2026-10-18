package com.codev.onboardingdiary.common;

/** Small helpers for normalising user-entered text. */
public final class Texts {

  private Texts() {}

  /** Returns the trimmed value, or {@code null} when it is null or blank. */
  public static String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.strip();
    return trimmed.isEmpty() ? null : trimmed;
  }

  public static String normalizeEmail(String email) {
    return email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
  }
}
