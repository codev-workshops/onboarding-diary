package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.user.PasswordPolicy;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Password reset performed by an admin. */
public record AdminPasswordRequest(
    @NotNull @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
        String newPassword) {}
