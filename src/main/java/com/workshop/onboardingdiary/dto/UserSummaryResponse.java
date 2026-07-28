package com.workshop.onboardingdiary.dto;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import java.time.LocalDate;

/** User details safe to expose; never carries the password hash. */
public record UserSummaryResponse(Long id, String name, String email, Role role, String department,
                                  LocalDate startDate) {

    public static UserSummaryResponse from(User user) {
        return new UserSummaryResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                user.getDepartment().getName(), user.getStartDate());
    }
}
