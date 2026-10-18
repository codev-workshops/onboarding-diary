package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Admin edit of an existing account; email is immutable. */
public record AdminUserUpdateRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull Role role,
    @Size(max = 100) String department,
    LocalDate startDate,
    Long managerId,
    @NotNull Boolean active) {}
