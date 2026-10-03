package com.codev.onboardingdiary.profile;

import com.codev.onboardingdiary.user.ProfileDetails;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateProfileRequest(
    @NotBlank @Size(max = 120) String fullName,
    @Size(max = 120) String jobTitle,
    @NotBlank @Size(max = 120) String department,
    @NotNull LocalDate startDate) {

  public ProfileDetails toProfileDetails() {
    return new ProfileDetails(fullName, jobTitle, department, startDate);
  }
}
