package com.workshop.onboardingdiary.dto;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import java.time.LocalDate;

/** Profile view returned by {@code /api/me} (REQUIREMENTS US-R03). */
public record ProfileResponse(Long id, String name, String email, Role role, String department,
                              LocalDate startDate) {

    public static ProfileResponse from(User user) {
        return new ProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                user.getDepartment().getName(), user.getStartDate());
    }
}
