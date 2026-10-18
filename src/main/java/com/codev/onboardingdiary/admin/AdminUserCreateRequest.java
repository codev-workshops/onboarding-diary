package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.user.PasswordPolicy;
import com.codev.onboardingdiary.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Admin-created account of any role. */
public record AdminUserCreateRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email @Size(max = 254) String email,
    @NotNull @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE)
        String password,
    @NotNull Role role,
    @Size(max = 100) String department,
    LocalDate startDate,
    Long managerId) {}
