package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.auth.PasswordPolicy;
import com.codev.onboardingdiary.user.ProfileDetails;
import com.codev.onboardingdiary.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Set;

/** Admin-created account; the temporary password must be changed at first login. */
public record CreateUserRequest(
    @NotBlank @Email @Size(max = 255) String email,
    @NotNull @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
        String temporaryPassword,
    @NotBlank @Size(max = 120) String fullName,
    @Size(max = 120) String jobTitle,
    @NotBlank @Size(max = 120) String department,
    @NotNull LocalDate startDate,
    @NotEmpty Set<@NotNull Role> roles,
    Long managerId) {

  public ProfileDetails toProfileDetails() {
    return new ProfileDetails(fullName, jobTitle, department, startDate);
  }
}
