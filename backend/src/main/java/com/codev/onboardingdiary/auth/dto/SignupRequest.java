package com.codev.onboardingdiary.auth.dto;

import com.codev.onboardingdiary.auth.PasswordPolicy;
import com.codev.onboardingdiary.user.ProfileDetails;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record SignupRequest(
    @NotBlank @Email @Size(max = 255) String email,
    @NotNull @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
        String password,
    @NotBlank @Size(max = 120) String fullName,
    @Size(max = 120) String jobTitle,
    @NotBlank @Size(max = 120) String department,
    @NotNull LocalDate startDate) {

  public ProfileDetails toProfileDetails() {
    return new ProfileDetails(fullName, jobTitle, department, startDate);
  }
}
