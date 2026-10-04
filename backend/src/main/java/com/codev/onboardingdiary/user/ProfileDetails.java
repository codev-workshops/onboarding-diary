package com.codev.onboardingdiary.user;

import java.time.LocalDate;

/** Editable profile fields shared by signup, profile update and admin user creation. */
public record ProfileDetails(
    String fullName, String jobTitle, String department, LocalDate startDate) {

  public ProfileDetails {
    fullName = fullName.trim();
    jobTitle = jobTitle == null || jobTitle.isBlank() ? null : jobTitle.trim();
    department = department.trim();
  }
}
