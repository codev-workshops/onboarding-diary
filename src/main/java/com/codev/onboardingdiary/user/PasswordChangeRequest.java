package com.codev.onboardingdiary.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Change of the logged-in user's own password. */
public record PasswordChangeRequest(
    @NotBlank String currentPassword,
    @NotNull @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
        String newPassword) {}
