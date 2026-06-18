package com.onboardingdiary.dto;

import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.UserStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Admin-only update. Admins may change role, status, and all profile fields.
 * Email is immutable in the MVP (it is the login identity).
 */
public record AdminUpdateUserRequest(
        @NotBlank @Size(min = 1, max = 100) String name,
        @NotNull Role role,
        @NotNull UserStatus status,
        @Size(max = 100) String department,
        LocalDate joinDate,
        Long managerId
) {
}
