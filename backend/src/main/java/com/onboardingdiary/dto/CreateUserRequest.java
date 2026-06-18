package com.onboardingdiary.dto;

import com.onboardingdiary.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Admin-only request to create a user. Per the MVP simplification, there is no
 * invite/email flow: the admin sets an initial password directly.
 */
public record CreateUserRequest(
        @NotBlank @Size(min = 1, max = 100) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotNull Role role,
        @NotBlank @Size(min = 10, max = 255) String password,
        @Size(max = 100) String department,
        LocalDate joinDate,
        Long managerId
) {
}
