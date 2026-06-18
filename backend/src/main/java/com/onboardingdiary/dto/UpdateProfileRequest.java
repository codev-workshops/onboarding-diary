package com.onboardingdiary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-service profile update. A user may edit their own name and department
 * only; email, role, status, and manager remain admin-controlled (FR-11).
 */
public record UpdateProfileRequest(
        @NotBlank @Size(min = 1, max = 100) String name,
        @Size(max = 100) String department
) {
}
