package com.codev.onboardingdiary.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Fields a user may change on their own profile. */
public record ProfileUpdateRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 100) String department,
    LocalDate startDate) {}
